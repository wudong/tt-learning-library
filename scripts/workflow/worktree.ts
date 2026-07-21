/**
 * Worktree + .wip/ scratch area — step 3.
 */
import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { basename, dirname, join } from "node:path";
import { REPO_ROOT, WORKTREE_BASE } from "./config.ts";

function git(args: string[], cwd = REPO_ROOT, input?: string): string {
  return execFileSync("git", args, {
    cwd,
    input: input ?? undefined,
    stdio: ["pipe", "pipe", "pipe"],
    encoding: "utf8",
    env: process.env,
  }).trim();
}

function repoName(): string {
  return basename(git(["rev-parse", "--show-toplevel"]));
}

export interface Worktree {
  path: string;
  branch: string;
  name: string;
}

export async function createWorktree(name: string): Promise<Worktree> {
  const safe = name.replace(/[^A-Za-z0-9._-]+/g, "-");
  const branch = `wip/${safe}`;
  const parent = join(WORKTREE_BASE, repoName());
  await mkdir(parent, { recursive: true });
  const path = join(parent, safe);

  // Remove a stale worktree entry if it lingers, then create a fresh branch+worktree.
  if (existsSync(path)) {
    throw new Error(`worktree path already exists: ${path}`);
  }
  try {
    git(["worktree", "prune"]);
  } catch {
    /* ignore */
  }
  git(["worktree", "add", "-b", branch, path]);
  console.log(`[worktree] created ${path} on branch ${branch}`);

  // Bring over a local .env if present so the dev server can run.
  const envSrc = join(REPO_ROOT, ".env");
  if (existsSync(envSrc)) {
    await writeFile(join(path, ".env"), await readFile(envSrc));
  }

  // Install deps inside the worktree (shares package.json; separate node_modules).
  try {
    execFileSync("bun", ["install", "--no-progress"], { cwd: path, stdio: "inherit", env: process.env });
  } catch (e) {
    console.warn(`[worktree] bun install failed; agent steps may need it. (${(e as Error).message})`);
  }

  return { path, branch, name: safe };
}

/** Ensure `.wip/` is ignored at the repo root (shared across worktrees). */
export async function ensureWipGitignored(): Promise<void> {
  const gitignore = join(REPO_ROOT, ".gitignore");
  let content = "";
  try {
    content = await readFile(gitignore, "utf8");
  } catch {
    content = "";
  }
  if (!/^\.wip\/?\s*$/m.test(content)) {
    await appendFile(gitignore, `\n# workflow scratch area\n.wip/\n`);
    console.log(`[worktree] added .wip/ to ${gitignore}`);
  }
}

export async function writeTaskMd(worktreePath: string, content: string): Promise<void> {
  const dir = join(worktreePath, ".wip");
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, "task.md"), content);
}

export async function writeWipFile(worktreePath: string, name: string, content: string): Promise<string> {
  const file = join(worktreePath, ".wip", name);
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, content);
  return file;
}

export async function readWipFile(worktreePath: string, name: string): Promise<string> {
  return await readFile(join(worktreePath, ".wip", name), "utf8");
}

export async function writeReport(worktreePath: string, name: string, content: string): Promise<string> {
  const dir = join(worktreePath, ".wip", "reports");
  await mkdir(dir, { recursive: true });
  const file = join(dir, name);
  await writeFile(file, content);
  return file;
}

export function runBash(cmd: string, cwd: string): string {
  return execFileSync("bash", ["-lc", cmd], { cwd, encoding: "utf8", env: process.env }).trim();
}