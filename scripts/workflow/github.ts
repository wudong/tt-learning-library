/**
 * GitHub via the `gh` CLI.
 */
import { execFileSync } from "node:child_process";
import { GH_LABELS, GH_REPO, REPO_ROOT } from "./config.ts";

function gh(args: string[], input?: string): string {
  const out = execFileSync("gh", args, {
    cwd: REPO_ROOT,
    input: input ?? undefined,
    stdio: ["pipe", "pipe", "pipe"],
    encoding: "utf8",
    env: process.env,
  });
  return out.trim();
}

function gitOut(args: string[]): string {
  return execFileSync("git", args, { cwd: REPO_ROOT, encoding: "utf8", env: process.env }).trim();
}

export function detectRepo(): string {
  if (GH_REPO) return GH_REPO;
  const url = gitOut(["remote", "get-url", "origin"]);
  // git@github.com:owner/repo.git  or  https://github.com/owner/repo(.git)
  const m = url.match(/github\.com[:/]([^/]+)\/([^/.\s]+)/);
  if (!m) throw new Error(`cannot detect owner/repo from origin: ${url}`);
  return `${m[1]}/${m[2]}`;
}

export interface CreatedIssue {
  number: number;
  url: string;
  title: string;
}

const LABEL_COLORS: Record<string, string> = {
  workflow: "5319e7",
  feedback: "fbca04",
  triage: "7047ff",
};

/** Create a label if it does not already exist (tolerates "already exists"). */
export function ensureLabel(repo: string, name: string): void {
  const color = LABEL_COLORS[name] ?? "ededed";
  try {
    gh(["label", "create", name, "--repo", repo, "--color", color, "--description", "managed by workflow"]);
    console.log(`[gh] created label '${name}'`);
  } catch (e: any) {
    if (!/already exists|Name already exists/i.test(e.message ?? "")) throw e;
  }
}

export function ensureLabels(repo: string): void {
  for (const l of GH_LABELS.split(",").map((s) => s.trim()).filter(Boolean)) {
    ensureLabel(repo, l);
  }
}

export function createIssue(repo: string, title: string, body: string): CreatedIssue {
  const labels = GH_LABELS.split(",").map((s) => s.trim()).filter(Boolean);
  const args = [
    "issue",
    "create",
    "--repo",
    repo,
    "--title",
    title,
    "--body-file",
    "-",
  ];
  for (const l of labels) args.push("--label", l);
  const url = gh(args, body);
  const m = url.match(/issues\/(\d+)$/);
  if (!m) throw new Error(`could not parse issue number from: ${url}`);
  return { number: Number(m[1]), url, title };
}

export function commentIssue(repo: string, number: number, body: string): void {
  gh(["issue", "comment", String(number), "--repo", repo, "--body-file", "-"], body);
}

export function editIssueBody(repo: string, number: number, body: string): void {
  gh(["issue", "edit", String(number), "--repo", repo, "--body-file", "-"], body);
}

export function viewIssue(repo: string, number: number): any {
  return JSON.parse(gh(["issue", "view", String(number), "--repo", repo, "--json", "number,title,state,url,body"]));
}

export function closeIssue(repo: string, number: number, comment?: string): void {
  if (comment) commentIssue(repo, number, comment);
  gh(["issue", "close", String(number), "--repo", repo]);
}