/**
 * sync — phase 1: feedback -> GitHub issues.
 *
 *   bun scripts/workflow/run.ts sync [--dry-run]
 *
 * Agent-assisted: a deepseek-v4-pro agent runs the `feedback-triage` skill
 * end-to-end with bash (gh + curl + jq). It loads unprocessed feedback
 * (status=new) from the standalone feedback service's admin API, decides per
 * batch whether to create / append / group, then writes back via PATCH
 * (status=converted_to_issue + github_issue_url). The orchestrator only
 * launches the agent (after ensuring the admin token is available) and
 * verifies afterward that no feedback was left unprocessed.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";
import { FEEDBACK_APP_ID, FEEDBACK_SERVICE_URL, REPO_ROOT, TRIAGE_MODEL } from "./config.ts";
import { detectRepo } from "./github.ts";
import { runAgent } from "./agent.ts";

function stamp(s: string): string {
  return `[${new Date().toISOString()}] ${s}`;
}

const SKILL_PATH = join(REPO_ROOT, "scripts", "workflow", "feedback-triage.SKILL.md");

/** Resolve the admin token from env or the gcloud secret (never printed). */
function ensureAdminToken(): string {
  if (process.env.FEEDBACK_ADMIN_TOKEN) return process.env.FEEDBACK_ADMIN_TOKEN;
  try {
    return execSync(
      "gcloud secrets versions access latest --secret=feedback-admin-token --project=wudong-agent-master",
      { encoding: "utf8", stdio: ["pipe", "pipe", "ignore"] },
    ).trim();
  } catch {
    throw new Error(
      "FEEDBACK_ADMIN_TOKEN not set and gcloud secret unavailable. Set FEEDBACK_ADMIN_TOKEN or authenticate gcloud.",
    );
  }
}

export async function runSync(args: string[]): Promise<void> {
  const dryRun = args.includes("--dry-run");
  const repo = detectRepo();
  console.log(`\n========== sync: feedback -> issues (repo=${repo}) ==========`);

  // Ensure the agent (bash) inherits the service env + admin token.
  const adminToken = ensureAdminToken();
  process.env.FEEDBACK_SERVICE_URL = FEEDBACK_SERVICE_URL;
  process.env.FEEDBACK_APP_ID = FEEDBACK_APP_ID;
  process.env.FEEDBACK_ADMIN_TOKEN = adminToken;
  console.log(`[sync] service=${FEEDBACK_SERVICE_URL} app_id=${FEEDBACK_APP_ID}${dryRun ? " (dry-run)" : ""}`);

  const skill = readFileSync(SKILL_PATH, "utf8");
  const dryRunLine = dryRun
    ? "\n\nMODE: DRY RUN. Follow the 'Dry-run mode' section exactly: analyze and print the plan only. Do NOT run `gh issue create/edit/comment` and do NOT run any PATCH."
    : "\n\nMODE: LIVE. Execute every step including writes and writeback. Never skip Step 6 (PATCH writeback).";

  const res = await runAgent({
    spec: TRIAGE_MODEL,
    cwd: REPO_ROOT,
    label: "sync",
    tools: ["read", "bash", "write", "grep", "find", "ls"],
    timeoutMs: 1000 * 60 * 20,
    systemAppend: `You are operating the feedback-triage skill. You have \`gh\`, \`curl\`, \`jq\`, and \`git\` on PATH and inherit the environment (FEEDBACK_SERVICE_URL, FEEDBACK_APP_ID, FEEDBACK_ADMIN_TOKEN). Work autonomously and finish the whole batch. Quote env vars in URLs. Afterward print the summary table from Step 7.`,
    prompt: `Run the feedback-triage procedure below end to end.\n\n--- SKILL ---\n${skill}${dryRunLine}`,
  });

  console.log("\n========== agent finished ==========");
  console.log(res.text.slice(0, 2000));
  if (res.toolErrors.length) console.warn(`[sync] ${res.toolErrors.length} tool error(s).`);

  if (dryRun) {
    console.log("\n[dry-run] no verification (nothing written).");
    process.exit(0);
  }

  // --- verify: no status=new feedback left, and list linkage -------------
  const headers = { authorization: `Bearer ${adminToken}` };
  const leftRes = await fetch(
    `${FEEDBACK_SERVICE_URL}/admin/feedback?app_id=${encodeURIComponent(FEEDBACK_APP_ID)}&status=new&limit=200`,
    { headers },
  );
  const left: any = leftRes.ok ? await leftRes.json() : { data: [] };
  const leftCount = left.data?.length ?? 0;
  if (leftCount > 0) {
    console.warn(`[sync] WARNING: ${leftCount} feedback item(s) still unprocessed.`);
  } else {
    console.log("[sync] verified: no unprocessed (status=new) feedback remains.");
  }

  const allRes = await fetch(
    `${FEEDBACK_SERVICE_URL}/admin/feedback?app_id=${encodeURIComponent(FEEDBACK_APP_ID)}&limit=200`,
    { headers },
  );
  if (allRes.ok) {
    const all: any = await allRes.json();
    console.table(
      (all.data ?? []).map((r: any) => ({
        id: String(r.id).slice(0, 8),
        type: r.message_type,
        status: r.status,
        issue: (r.github_issue_url ?? "").replace("https://github.com/" + repo + "/issues/", "#") || "-",
      })),
    );
  }
  process.exit(leftCount > 0 ? 1 : 0);
}