/**
 * migrate-feedback — one-off: copy existing feedback rows from the Postgres
 * `feedback` table into the standalone feedback service via POST /feedback.
 *
 *   bun scripts/workflow/migrate-feedback.ts [--dry-run]
 *
 * Env:
 *   MIGRATE_FEEDBACK_DB_URL  source Postgres (defaults to WORKFLOW_FEEDBACK_DB_URL)
 *   FEEDBACK_SERVICE_URL     target base URL (default https://feedback.graceliu.uk)
 *   FEEDBACK_APP_ID           target app namespace (default tt-learning-library)
 *   FEEDBACK_ADMIN_TOKEN      optional; if set (or gcloud secret found), linked rows
 *                            are PATCHed to status=converted_to_issue + github_issue_url
 *   WORKFLOW_GH_REPO          owner/repo for issue URLs (auto-detected otherwise)
 *
 * Idempotent: rows already migrated (matched by metadata.originalId in the target
 * service) are skipped, so re-running is safe.
 */
import { execSync } from "node:child_process";

const DRY = process.argv.includes("--dry-run");

const SOURCE_URL = process.env.MIGRATE_FEEDBACK_DB_URL ?? process.env.WORKFLOW_FEEDBACK_DB_URL;
const SERVICE_URL = (process.env.FEEDBACK_SERVICE_URL ?? "https://feedback.graceliu.uk").replace(/\/+$/, "");
const APP_ID = process.env.FEEDBACK_APP_ID ?? "tt-learning-library";

function detectRepo(): string {
  if (process.env.WORKFLOW_GH_REPO) return process.env.WORKFLOW_GH_REPO;
  const url = execSync("git remote get-url origin", { encoding: "utf8" }).trim();
  const m = url.match(/github\.com[:/]([^/]+)\/([^/.\s]+)/);
  if (!m) throw new Error(`cannot detect owner/repo from origin: ${url}`);
  return `${m[1]}/${m[2]}`;
}

function getAdminToken(): string | null {
  if (process.env.FEEDBACK_ADMIN_TOKEN) return process.env.FEEDBACK_ADMIN_TOKEN;
  try {
    return execSync(
      "gcloud secrets versions access latest --secret=feedback-admin-token --project=wudong-agent-master",
      { encoding: "utf8", stdio: ["pipe", "pipe", "ignore"] },
    ).trim();
  } catch {
    return null;
  }
}

interface SourceRow {
  id: string;
  name: string | null;
  email: string | null;
  message_type: string;
  message: string;
  page_path: string | null;
  page_title: string | null;
  created_at: string;
  github_issue_number: number | null;
}

async function main() {
  if (!SOURCE_URL) throw new Error("MIGRATE_FEEDBACK_DB_URL (or WORKFLOW_FEEDBACK_DB_URL) is required.");
  console.log(`\n========== migrate feedback -> ${SERVICE_URL} (app_id=${APP_ID}) ==========`);
  if (DRY) console.log("DRY RUN — no POSTs, no PATCHes.");

  const repo = detectRepo();
  const adminToken = getAdminToken();
  console.log(`[migrate] source DB set; admin token: ${adminToken ? "yes" : "no (linkage PATCH skipped)"}; repo=${repo}`);

  // 1) load existing target entries to dedup by metadata.originalId
  const migrated = new Set<string>();
  if (adminToken) {
    let offset = 0;
    while (true) {
      const res = await fetch(
        `${SERVICE_URL}/admin/feedback?app_id=${encodeURIComponent(APP_ID)}&limit=200&offset=${offset}`,
        { headers: { authorization: `Bearer ${adminToken}` } },
      );
      if (!res.ok) throw new Error(`admin list failed: ${res.status} ${await res.text()}`);
      const j: any = await res.json();
      for (const r of j.data ?? []) {
        const oid = r.metadata?.originalId;
        if (oid) migrated.add(String(oid));
      }
      if ((j.data ?? []).length < (j.limit ?? 200)) break;
      offset += (j.data ?? []).length;
      if (offset >= (j.total ?? 0)) break;
    }
    console.log(`[migrate] ${migrated.size} row(s) already migrated in target — will skip.`);
  }

  // 2) read source rows
  const { Pool } = await import("pg");
  const pool = new Pool({ connectionString: SOURCE_URL });
  const { rows } = await pool.query<SourceRow>(
    "SELECT id, name, email, message_type, message, page_path, page_title, created_at, github_issue_number FROM feedback ORDER BY created_at",
  );
  console.log(`[migrate] source has ${rows.length} row(s).`);

  const summary: Array<{ sourceId: string; targetId: string; issue: string; action: string }> = [];

  for (const r of rows) {
    if (migrated.has(String(r.id))) {
      summary.push({ sourceId: r.id, targetId: "-", issue: r.github_issue_number ? `#${r.github_issue_number}` : "-", action: "skipped (already migrated)" });
      continue;
    }

    const body = {
      app_id: APP_ID,
      message: r.message,
      message_type: r.message_type,
      name: r.name,
      email: r.email,
      page_path: r.page_path,
      page_title: r.page_title,
      metadata: {
        originalId: r.id,
        originalCreatedAt: r.created_at,
        migratedFrom: "tt-learning-library-postgres",
        userAgent: "migrate-feedback-script",
      },
    };

    if (DRY) {
      summary.push({ sourceId: r.id, targetId: "(would create)", issue: r.github_issue_number ? `#${r.github_issue_number} (would link)` : "-", action: "create-dry-run" });
      continue;
    }

    const res = await fetch(`${SERVICE_URL}/feedback`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const txt = await res.text();
      summary.push({ sourceId: r.id, targetId: "-", issue: "-", action: `error: HTTP ${res.status} ${txt.slice(0, 120)}` });
      console.error(`[migrate] ${r.id} failed: HTTP ${res.status}`);
      continue;
    }
    const created: any = await res.json();
    const newId: string = created.id;

    // preserve GitHub linkage if the source row was already linked to an issue
    if (r.github_issue_number && adminToken) {
      const issueUrl = `https://github.com/${repo}/issues/${r.github_issue_number}`;
      const patch = await fetch(`${SERVICE_URL}/admin/feedback/${newId}`, {
        method: "PATCH",
        headers: { authorization: `Bearer ${adminToken}`, "content-type": "application/json" },
        body: JSON.stringify({ status: "converted_to_issue", github_issue_url: issueUrl }),
      });
      if (!patch.ok) {
        console.warn(`[migrate] ${r.id} created as ${newId} but linkage PATCH failed: HTTP ${patch.status}`);
      }
    }

    summary.push({ sourceId: r.id, targetId: newId, issue: r.github_issue_number ? `#${r.github_issue_number}` : "-", action: r.github_issue_number ? "created+linked" : "created" });
    console.log(`[migrate] ${r.id} -> ${newId}${r.github_issue_number ? ` (linked #${r.github_issue_number})` : ""}`);
  }

  await pool.end();

  console.log("\n========== migrate summary ==========");
  console.table(summary);
  const created = summary.filter((s) => s.action.startsWith("created")).length;
  const skipped = summary.filter((s) => s.action.startsWith("skipped")).length;
  const errors = summary.filter((s) => s.action.startsWith("error")).length;
  console.log(`created=${created} skipped=${skipped} errors=${errors}${DRY ? " (dry-run)" : ""}`);
}

main().catch((e) => {
  console.error("\n[migrate] FATAL:", e?.stack || e);
  process.exit(2);
});