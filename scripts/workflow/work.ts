/**
 * work — phase 2: one GitHub issue -> triage + worktree + plan + implement + review.
 *
 *   bun scripts/workflow/run.ts work --issue <N>
 *   bun scripts/workflow/run.ts work --next            # lowest open "workflow" issue
 *
 * The issue body is owned by the sync phase; this phase only adds comments and,
 * on approval, closes the issue.
 *
 * .wip/ is the handover/checkpoint source of truth. Every phase must write a
 * non-empty artifact before the workflow may continue:
 *   - .wip/task.md      issue + running context
 *   - .wip/triage.md    triage analysis
 *   - .wip/plan.md      detailed implementation plan
 *   - .wip/state.json   machine-readable checkpoint
 *   - .wip/handover.md  concise "next agent picks up here" note
 *   - .wip/reports/*    implement/review/final reports
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import {
  IMPLEMENT_MODEL,
  MAX_ROUNDS,
  PLAN_MODEL,
  REVIEW_MODEL,
  REPO_ROOT,
  TRIAGE_MODEL,
  WORKTREE_BASE,
} from "./config.ts";
import { closeIssue, commentIssue, detectRepo, viewIssue } from "./github.ts";
import {
  createWorktree,
  ensureWipGitignored,
  readWipFile,
  writeReport,
  writeTaskMd,
  writeWipFile,
  type Worktree,
} from "./worktree.ts";
import { extractSection, runAgent } from "./agent.ts";

function stamp(s: string): string {
  return `[${new Date().toISOString()}] ${s}`;
}

function pickIssueNumber(args: string[]): number | "next" | null {
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--issue") return Number(args[++i]);
    if (args[i] === "--next") return "next";
  }
  return null;
}

function hasFreshFlag(args: string[]): boolean {
  return args.includes("--fresh");
}

async function lowestOpenWorkflowIssue(repo: string): Promise<number> {
  const { execFileSync } = await import("node:child_process");
  const out = execFileSync(
    "gh",
    ["issue", "list", "--repo", repo, "--label", "workflow", "--state", "open", "--json", "number", "--limit", "100"],
    { encoding: "utf8", env: process.env },
  );
  const nums = (JSON.parse(out) as Array<{ number: number }>).map((x) => x.number).sort((a, b) => a - b);
  if (nums.length === 0) throw new Error("no open issues labeled 'workflow'.");
  return nums[0];
}

function isMeaningful(text: string | null | undefined): boolean {
  if (!text) return false;
  const trimmed = text.trim();
  return trimmed.length > 0 && trimmed !== "(no output)";
}

function mustMeaningful(label: string, text: string | null | undefined): string {
  if (!isMeaningful(text)) {
    throw new Error(`${label} was empty or '(no output)'. Aborting instead of silently continuing.`);
  }
  return text!.trim();
}

interface WorkflowState {
  issueNumber: number;
  repo: string;
  branch: string;
  worktreePath: string;
  phase: "triage" | "plan" | "implement" | "review" | "final" | "failed" | "done";
  round: number;
  lastSuccessfulStep: string;
  status: "in_progress" | "approved" | "not_approved" | "failed";
  updatedAt: string;
}

async function writeState(wt: Worktree, state: WorkflowState): Promise<void> {
  await writeWipFile(wt.path, "state.json", JSON.stringify(state, null, 2) + "\n");
}

async function writeHandover(
  wt: Worktree,
  opts: {
    issueNumber: number;
    repo: string;
    phase: WorkflowState["phase"];
    round: number;
    lastSuccessfulStep: string;
    nextAction: string;
    note?: string;
  },
): Promise<void> {
  const content = `# Handover\n\n- Issue: #${opts.issueNumber}\n- Repo: ${opts.repo}\n- Branch: ${wt.branch}\n- Worktree: ${wt.path}\n- Phase: ${opts.phase}\n- Round: ${opts.round}\n- Last successful step: ${opts.lastSuccessfulStep}\n- Generated: ${new Date().toISOString()}\n\n## Next action\n\n${opts.nextAction}\n\n${opts.note ? `## Note\n\n${opts.note}\n` : ""}`;
  await writeWipFile(wt.path, "handover.md", content);
}

function appendToTaskMd(wt: Worktree, section: string): void {
  const p = join(wt.path, ".wip", "task.md");
  writeFileSync(p, `${readFileSync(p, "utf8")}\n\n${section}\n`, "utf8");
}

// --- triage ---------------------------------------------------------------
async function triage(repo: string, issueNumber: number, issue: any): Promise<string> {
  console.log(stamp(`work: triage issue #${issueNumber} (deepseek-v4-pro)`));
  const res = await runAgent({
    spec: TRIAGE_MODEL,
    cwd: REPO_ROOT,
    label: "triage",
    tools: ["read", "bash", "grep", "find", "ls"],
    prompt: `You are triaging GitHub issue #${issueNumber} for the "tt-learning-library" repo at ${REPO_ROOT}.

Issue title: ${issue.title}
Issue body:
${issue.body ?? "(empty)"}

Inspect the codebase (AGENTS.md, docs/, apps/, packages/) and analyze the issue against the current code.
Produce a triage that a developer can act on. Output EXACTLY:

### TRIAGE_ANALYSIS
<root cause, affected code areas with file refs, whether it reproduces, severity, and a proposed direction>

### SCOPE
<bullet list of files/areas likely to change>`,
  });

  const analysis = mustMeaningful(
    "triage analysis",
    `${extractSection(res.text, "TRIAGE_ANALYSIS")}\n\n### Scope\n${extractSection(res.text, "SCOPE")}`,
  );
  return analysis;
}

// --- worktree: fresh or resume -------------------------------------------

function worktreePathFor(issueNumber: number): string {
  return join(WORKTREE_BASE, basename(REPO_ROOT), `issue-${issueNumber}`);
}

async function getOrCreateWorktree(
  issueNumber: number,
  issue: any,
  repo: string,
  fresh: boolean,
): Promise<{ wt: Worktree; resumeFrom: WorkflowState | null }> {
  const wtPath = worktreePathFor(issueNumber);

  if (existsSync(wtPath) && !fresh) {
    const statePath = join(wtPath, ".wip", "state.json");
    if (existsSync(statePath)) {
      const state: WorkflowState = JSON.parse(await readWipFile(wtPath, "state.json"));
      const wt: Worktree = {
        path: wtPath,
        branch: state.branch,
        name: `issue-${issueNumber}`,
      };
      console.log(stamp(`resume worktree ${wtPath} | phase=${state.phase} round=${state.round} lastStep=${state.lastSuccessfulStep} status=${state.status}`));
      return { wt, resumeFrom: state };
    }
    // Worktree exists but no state.json — stale (pre-artifact run)
    throw new Error(
      `Stale worktree exists with no .wip/state.json: ${wtPath}.\n` +
        `Remove it (rm -rf ${wtPath}) and re-run, or pass --fresh.`,
    );
  }

  // Fresh or --fresh: delete stale worktree if present, then create
  if (fresh && existsSync(wtPath)) {
    const { rm } = await import("node:fs/promises");
    const { execFileSync } = await import("node:child_process");
    console.log(stamp(`--fresh: removing existing worktree ${wtPath}`));
    await rm(wtPath, { recursive: true, force: true });
    try {
      execFileSync("git", ["worktree", "prune"], { cwd: REPO_ROOT, stdio: "pipe", env: process.env });
    } catch { /* ignore */ }
    try {
      execFileSync("git", ["branch", "-D", `wip/issue-${issueNumber}`], { cwd: REPO_ROOT, stdio: "pipe", env: process.env });
    } catch { /* branch may not exist */ }
  }

  return { wt: await setupWorktree(issueNumber, issue, repo), resumeFrom: null };
}

// --- worktree + initial task ---------------------------------------------
async function setupWorktree(issueNumber: number, issue: any, repo: string): Promise<Worktree> {
  console.log(stamp(`work: create worktree for issue #${issueNumber}`));
  await ensureWipGitignored();
  const wt = await createWorktree(`issue-${issueNumber}`);
  const taskMd = `# Task: ${issue.title}

- GitHub issue: #${issueNumber} — ${issue.url ?? ""}
- Worktree: ${wt.path}
- Branch: ${wt.branch}
- Created: ${new Date().toISOString()}

## Issue body

${issue.body ?? ""}
`;
  await writeTaskMd(wt.path, taskMd);
  await writeState(wt, {
    issueNumber,
    repo,
    branch: wt.branch,
    worktreePath: wt.path,
    phase: "triage",
    round: 0,
    lastSuccessfulStep: "worktree_created",
    status: "in_progress",
    updatedAt: new Date().toISOString(),
  });
  await writeHandover(wt, {
    issueNumber,
    repo,
    phase: "triage",
    round: 0,
    lastSuccessfulStep: "worktree_created",
    nextAction: "Run triage and write .wip/triage.md before continuing.",
  });
  console.log(stamp(`wrote ${join(wt.path, ".wip", "task.md")}`));
  return wt;
}

// --- plan -----------------------------------------------------------------
async function plan(wt: Worktree, issueNumber: number): Promise<string> {
  console.log(stamp("work: plan (glm-5.2)"));
  const res = await runAgent({
    spec: PLAN_MODEL,
    cwd: wt.path,
    label: "plan",
    tools: ["read", "bash", "grep", "find", "ls", "write", "edit"],
    prompt: `You are planning the fix for the GitHub issue recorded in .wip/task.md (worktree root: ${wt.path}).

1. Read .wip/task.md fully (issue + triage).
2. Study the relevant parts of the codebase and docs (AGENTS.md, TECH.md, DATA_MODEL.md, API_CONTRACT.md, etc.).
3. Write the FULL detailed plan to .wip/plan.md. Include:
   - ordered, concrete steps (files to touch, functions to add/change, migrations, tests to add),
   - risk/rollback notes,
   - the exact commands to verify locally (typecheck, lint, test, db:migrate, build, dev).
4. Also append a concise "## Implementation Plan" section to .wip/task.md with the key ordered steps.
5. Output a short markdown summary to post as a GitHub comment:

### PLAN_SUMMARY
<bulleted high-level plan, <=15 lines>`,
  });

  const summary = mustMeaningful("plan summary", extractSection(res.text, "PLAN_SUMMARY") || res.text);
  const planDoc = mustMeaningful(".wip/plan.md", await readWipFile(wt.path, "plan.md"));
  const taskDoc = await readWipFile(wt.path, "task.md");
  if (!/## Implementation Plan/.test(taskDoc)) {
    throw new Error("task.md was not updated with an '## Implementation Plan' section.");
  }
  void planDoc;
  commentIssue(detectRepo(), issueNumber, `## Implementation plan (glm-5.2)\n\n${summary}\n\n— _workflow_`);
  console.log(stamp("posted plan comment"));
  return summary;
}

// --- implement ------------------------------------------------------------
function implementPrompt(wt: Worktree, round: number): string {
  const reviewHint =
    round > 1
      ? `\n\nA PREVIOUS REVIEW REQUESTED CHANGES. See .wip/reports/review-round-${round - 1}.md and the '## Review (round ${round - 1})' section in .wip/task.md. Address EVERY required change before declaring done.`
      : "";
  return `You are implementing the fix planned in .wip/task.md (worktree root: ${wt.path}).${reviewHint}

Do the work end-to-end:
1. Read .wip/task.md, .wip/triage.md, and .wip/plan.md fully.
2. Implement the changes following the plan. Keep changes minimal and reviewable.
3. Run the project's quality gates and fix what you break:
   - bun run typecheck
   - bun run lint
   - bun run test
   - bun run db:migrate   (from empty where applicable)
   - bun run build
4. Start the app locally (e.g. \`bun run dev\`) in the background. Smoke-test the
   affected core flow(s) with the **agent-browser** CLI:
     - first: \`agent-browser skills get core\`
     - then: open / snapshot / interact / screenshot as needed
   Save screenshots under .wip/reports/. Stop the dev server when done (kill the pid you started).
5. You MUST write a non-empty report to .wip/reports/implement-round-${round}.md with:
   - changed files,
   - commands run and pass/fail,
   - browser smoke-test steps + screenshot paths,
   - known limitations,
   - if blocked or no code changes were made, explain exactly why.
6. Output your final report:

### IMPLEMENT_REPORT
<markdown: what changed, test/browser results, pass/fail, caveats>`;
}

async function implement(wt: Worktree, round: number): Promise<string> {
  console.log(stamp(`work: implement round ${round} (deepseek-v4-pro)`));
  const res = await runAgent({
    spec: IMPLEMENT_MODEL,
    cwd: wt.path,
    label: `implement#${round}`,
    tools: ["read", "bash", "edit", "write", "grep", "find", "ls"],
    timeoutMs: 1000 * 60 * 40,
    prompt: implementPrompt(wt, round),
  });

  const reportText = mustMeaningful(
    `.wip/reports/implement-round-${round}.md`,
    await readWipFile(wt.path, `reports/implement-round-${round}.md`),
  );
  const summary = mustMeaningful("implement summary", extractSection(res.text, "IMPLEMENT_REPORT") || reportText);
  if (res.toolErrors.length) console.warn(`[implement] ${res.toolErrors.length} tool error(s).`);
  return summary;
}

// --- review ---------------------------------------------------------------
async function review(
  wt: Worktree,
  round: number,
): Promise<{ verdict: "APPROVED" | "CHANGES_REQUESTED"; findings: string; required: string }> {
  console.log(stamp(`work: review round ${round} (glm-5.2 high)`));
  const res = await runAgent({
    spec: REVIEW_MODEL,
    cwd: wt.path,
    label: `review#${round}`,
    tools: ["read", "bash", "grep", "find", "ls"],
    timeoutMs: 1000 * 60 * 25,
    prompt: `You are a strict reviewer for the fix implemented in worktree ${wt.path} (branch ${wt.branch}).

Plan and issue context: .wip/task.md, .wip/triage.md, .wip/plan.md. Prior reports: .wip/reports/.
Independently verify:
- \`git diff main --stat\` and read the actual diff for correctness, scope, and style (follow AGENTS.md invariants).
- Run: bun run typecheck && bun run lint && bun run test && bun run build. (Run db:migrate if schema changed.)
- Confirm the implement report's browser checks are backed by screenshots under .wip/reports/.

Be skeptical. Output EXACTLY:

### VERDICT
APPROVED | CHANGES_REQUESTED

### FINDINGS
- bullet list of verified facts and any problems

### REQUIRED_CHANGES
- bullet list of concrete, required fixes (write "none" if APPROVED)`,
  });

  const verdict = mustMeaningful("review verdict", extractSection(res.text, "VERDICT").split("\n")[0].trim().toUpperCase()) as
    | "APPROVED"
    | "CHANGES_REQUESTED";
  const findings = extractSection(res.text, "FINDINGS").trim();
  const required = extractSection(res.text, "REQUIRED_CHANGES").trim();
  if (!isMeaningful(findings) && !isMeaningful(required)) {
    throw new Error("review returned no findings or required changes; aborting instead of looping blindly.");
  }

  const reviewDoc = `### VERDICT\n${verdict}\n\n### FINDINGS\n${findings || "(none)"}\n\n### REQUIRED_CHANGES\n${required || "(none)"}\n`;
  await writeReport(wt.path, `review-round-${round}.md`, reviewDoc);
  return { verdict, findings, required };
}

// --- main -----------------------------------------------------------------
export async function runWork(args: string[]): Promise<void> {
  const pick = pickIssueNumber(args);
  if (pick === null) {
    console.error("usage: bun scripts/workflow/run.ts work --issue <N> | --next [--fresh]");
    process.exit(2);
  }

  const repo = detectRepo();
  const fresh = hasFreshFlag(args);
  const issueNumber = pick === "next" ? await lowestOpenWorkflowIssue(repo) : pick;
  if (!Number.isFinite(issueNumber)) {
    console.error("invalid issue number");
    process.exit(2);
  }

  let wt: Worktree | null = null;
  let phase: WorkflowState["phase"] = "triage";
  let round = 0;
  let lastSuccessfulStep = "started";
  let approved = false;
  let lastImplementReport = "";
  let lastReview: Awaited<ReturnType<typeof review>> | null = null;

  console.log(`\n========== work: issue #${issueNumber} (repo=${repo}) ==========`);
  console.log(`[work] models: triage=${TRIAGE_MODEL.provider}/${TRIAGE_MODEL.id}(${TRIAGE_MODEL.thinking}) plan=${PLAN_MODEL.provider}/${PLAN_MODEL.id}(${PLAN_MODEL.thinking}) implement=${IMPLEMENT_MODEL.provider}/${IMPLEMENT_MODEL.id}(${IMPLEMENT_MODEL.thinking}) review=${REVIEW_MODEL.provider}/${REVIEW_MODEL.id}(${REVIEW_MODEL.thinking}) | max rounds=${MAX_ROUNDS}`);
  console.log(`[work] start ${new Date().toISOString()}`);
  const t0 = Date.now();

  try {
    const issue = viewIssue(repo, issueNumber);
    if (issue.state && String(issue.state).toUpperCase() !== "OPEN") {
      console.warn(`[work] issue #${issueNumber} is ${issue.state}; proceeding anyway.`);
    }

    const { wt: worktree, resumeFrom } = await getOrCreateWorktree(issueNumber, issue, repo, fresh);
    wt = worktree;

    // --- handle resume (jump to the right phase) ---
    if (resumeFrom) {
      const s = resumeFrom;
      // Terminal states — nothing more to do
      if (s.status === "approved" || (s.status === "not_approved" && s.phase === "failed")) {
        console.log(stamp(`work already finalised (status=${s.status}). Nothing to do.`));
        console.log(`  worktree: ${wt.path}\n  branch: ${wt.branch}`);
        process.exit(0);
      }
      round = s.round;
      lastSuccessfulStep = s.lastSuccessfulStep;
      if (s.status === "failed") {
        console.log(stamp(`previous run failed. Resuming at phase=${s.phase} round=${round}.`));
      } else {
        console.log(stamp(`resuming: phase=${s.phase} round=${round} lastStep=${lastSuccessfulStep}`));
      }

      // If resuming at "review" phase, implement for this round is already done.
      // Run the review immediately, then continue the normal loop.
      if (s.phase === "review") {
        phase = "review";
        lastReview = await review(wt, round);
        appendToTaskMd(wt,
          `## Review (round ${round})\n\nVerdict: **${lastReview.verdict}**\n\n### Findings\n${lastReview.findings}\n\n### Required changes\n${lastReview.required}`,
        );
        commentIssue(repo, issueNumber,
          `## Review round ${round} (glm-5.2 high)\n\n**Verdict: ${lastReview.verdict}**\n\n### Findings\n${lastReview.findings}\n\n### Required changes\n${lastReview.required}\n\n— _workflow_`,
        );
        approved = lastReview.verdict === "APPROVED";
        console.log(stamp(`round ${round}/${MAX_ROUNDS} verdict: ${lastReview.verdict}${approved ? " ✅" : " → changes requested"}`));
        lastSuccessfulStep = `review_round_${round}`;
        if (!approved && round < MAX_ROUNDS) {
          round++;
          await writeState(wt, { issueNumber, repo, branch: wt.branch, worktreePath: wt.path, phase: "implement", round, lastSuccessfulStep, status: "in_progress", updatedAt: new Date().toISOString() });
          await writeHandover(wt, { issueNumber, repo, phase: "implement", round, lastSuccessfulStep, nextAction: `Implement round ${round}, addressing .wip/reports/review-round-${round - 1}.md.` });
          console.log(stamp(`review requested changes → re-implementing (round ${round}/${MAX_ROUNDS})`));
        }
      }
    }

    // --- triage (fresh, or resume from triage phase) ---
    if (!resumeFrom || resumeFrom.phase === "triage") {
      phase = "triage";
      const triageText = mustMeaningful("triage", await triage(repo, issueNumber, issue));
      await writeWipFile(wt.path, "triage.md", triageText + "\n");
      appendToTaskMd(wt, `## Triage\n\n${triageText}`);
      commentIssue(repo, issueNumber, `## Triage (deepseek-v4-pro)\n\n${triageText}\n\n— _workflow_`);
      lastSuccessfulStep = "triage";
      await writeState(wt, { issueNumber, repo, branch: wt.branch, worktreePath: wt.path, phase: "plan", round: 0, lastSuccessfulStep, status: "in_progress", updatedAt: new Date().toISOString() });
      await writeHandover(wt, { issueNumber, repo, phase: "plan", round: 0, lastSuccessfulStep, nextAction: "Generate .wip/plan.md and append a concise '## Implementation Plan' section to .wip/task.md." });
    }

    // --- plan (fresh, or resume from triage/plan phase) ---
    if (!resumeFrom || resumeFrom.phase === "triage" || resumeFrom.phase === "plan") {
      phase = "plan";
      const planSummary = await plan(wt, issueNumber);
      void planSummary;
      lastSuccessfulStep = "plan";
      await writeState(wt, { issueNumber, repo, branch: wt.branch, worktreePath: wt.path, phase: "implement", round: 1, lastSuccessfulStep, status: "in_progress", updatedAt: new Date().toISOString() });
      await writeHandover(wt, { issueNumber, repo, phase: "implement", round: 1, lastSuccessfulStep, nextAction: "Implement round 1. Must write .wip/reports/implement-round-1.md before continuing." });
    }

    // --- implement/review loop ---
    while (round < MAX_ROUNDS && !approved) {
      round++;

      // implement
      phase = "implement";
      lastImplementReport = await implement(wt, round);
      commentIssue(repo, issueNumber, `## Implement round ${round} report (deepseek-v4-pro)\n\n${lastImplementReport}\n\n— _workflow_`);
      lastSuccessfulStep = `implement_round_${round}`;
      await writeState(wt, { issueNumber, repo, branch: wt.branch, worktreePath: wt.path, phase: "review", round, lastSuccessfulStep, status: "in_progress", updatedAt: new Date().toISOString() });
      await writeHandover(wt, { issueNumber, repo, phase: "review", round, lastSuccessfulStep, nextAction: `Review round ${round}. Must write .wip/reports/review-round-${round}.md before continuing.` });

      // review
      phase = "review";
      lastReview = await review(wt, round);
      appendToTaskMd(wt, `## Review (round ${round})\n\nVerdict: **${lastReview.verdict}**\n\n### Findings\n${lastReview.findings}\n\n### Required changes\n${lastReview.required}`);
      commentIssue(repo, issueNumber, `## Review round ${round} (glm-5.2 high)\n\n**Verdict: ${lastReview.verdict}**\n\n### Findings\n${lastReview.findings}\n\n### Required changes\n${lastReview.required}\n\n— _workflow_`);

      approved = lastReview.verdict === "APPROVED";
      console.log(stamp(`round ${round}/${MAX_ROUNDS} verdict: ${lastReview.verdict}${approved ? " ✅" : " → changes requested"}`));
      lastSuccessfulStep = `review_round_${round}`;

      if (!approved && round < MAX_ROUNDS) {
        await writeState(wt, { issueNumber, repo, branch: wt.branch, worktreePath: wt.path, phase: "implement", round: round + 1, lastSuccessfulStep, status: "in_progress", updatedAt: new Date().toISOString() });
        await writeHandover(wt, { issueNumber, repo, phase: "implement", round: round + 1, lastSuccessfulStep, nextAction: `Implement round ${round + 1}, addressing .wip/reports/review-round-${round}.md.` });
        console.log(stamp(`review requested changes → re-implementing (round ${round + 1}/${MAX_ROUNDS})`));
      }
    }

    // final report
    phase = "final";
    console.log(stamp("work: final report"));
    console.log(stamp(`done in ${((Date.now() - t0) / 1000).toFixed(0)}s | rounds=${round} | final=${approved ? "APPROVED" : "NOT APPROVED"}`));
    const finalReport = `# Fix-loop report — issue #${issueNumber}

- Issue: #${issueNumber} — ${issue.url ?? ""}
- Worktree: ${wt.path} (branch ${wt.branch})
- Rounds: ${round} (max ${MAX_ROUNDS})
- Final verdict: ${approved ? "APPROVED" : "NOT APPROVED (max rounds reached)"}

## Last implementation report
${lastImplementReport}

## Last review
Verdict: ${lastReview?.verdict}
### Findings
${lastReview?.findings}
### Required changes
${lastReview?.required}

Generated: ${new Date().toISOString()}
`;
    const reportFile = await writeReport(wt.path, "final-report.md", finalReport);
    await writeState(wt, { issueNumber, repo, branch: wt.branch, worktreePath: wt.path, phase: approved ? "done" : "failed", round, lastSuccessfulStep, status: approved ? "approved" : "not_approved", updatedAt: new Date().toISOString() });
    await writeHandover(wt, { issueNumber, repo, phase: approved ? "done" : "failed", round, lastSuccessfulStep, nextAction: approved ? "Work complete. Review final report and merge the worktree branch if satisfied." : "Inspect .wip/plan.md, .wip/reports/, and the issue comments. Fix the blockers manually or re-run after workflow fixes.", note: approved ? `Final report: ${reportFile}` : `Final report: ${reportFile}` });
    console.log(`[report] ${reportFile}`);

    const ghBody = `${approved ? "✅ Approved" : "⚠️ Max review rounds reached without approval"}.\n\n${finalReport}\n\n— _workflow_`;
    if (approved) {
      closeIssue(repo, issueNumber, `## Done & tested\n\n${ghBody}`);
    } else {
      commentIssue(repo, issueNumber, `## Fix-loop status\n\n${ghBody}`);
    }

    console.log(`\n========== done ==========`);
    console.log(`issue   : #${issueNumber}`);
    console.log(`branch  : ${wt.branch}`);
    console.log(`worktree: ${wt.path}`);
    process.exit(approved ? 0 : 1);
  } catch (e: any) {
    if (wt) {
      // Preserve the phase that was running when the error occurred
      await writeState(wt, { issueNumber, repo, branch: wt.branch, worktreePath: wt.path, phase, round, lastSuccessfulStep, status: "failed", updatedAt: new Date().toISOString() });
      await writeHandover(wt, { issueNumber, repo, phase, round, lastSuccessfulStep, nextAction: `Resume from phase=${phase} round=${round}. Inspect .wip/task.md plus any artifacts already written, then re-run.`, note: `Workflow aborted: ${e?.message ?? e}` });
    }
    throw e;
  }
}
