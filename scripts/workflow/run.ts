/**
 * Workflow entrypoint / dispatcher.
 *
 *   bun scripts/workflow/run.ts sync [--new-only] [--dry-run]
 *   bun scripts/workflow/run.ts work --issue <N> | --next
 *
 * Phase 1 (sync):  feedback  -> GitHub issues   (batch, idempotent, no LLM)
 * Phase 2 (work):  one issue -> triage + worktree + plan + implement + review
 */
export {}

const [, , cmd, ...rest] = process.argv;

function usage(): void {
  console.log(`Usage:
  bun scripts/workflow/run.ts sync [--new-only] [--dry-run]
  bun scripts/workflow/run.ts work --issue <N> | --next
`);
}

try {
  if (cmd === "sync") {
    const { runSync } = await import("./sync.ts");
    await runSync(rest);
  } else if (cmd === "work") {
    const { runWork } = await import("./work.ts");
    await runWork(rest);
  } else {
    usage();
    process.exit(cmd ? 2 : 0);
  }
} catch (e: any) {
  console.error("\n[workflow] FATAL:", e?.stack || e);
  process.exit(2);
}