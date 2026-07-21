/**
 * Config — env-driven with sane defaults.
 */
import { homedir } from "node:os";
import { join } from "node:path";

export interface ModelSpec {
  provider: string;
  id: string;
  thinking: "off" | "minimal" | "low" | "medium" | "high" | "xhigh";
}

function env(key: string, def: string): string {
  const v = process.env[key];
  return v && v.trim().length > 0 ? v : def;
}
function intEnv(key: string, def: number): number {
  const v = Number(process.env[key]);
  return Number.isFinite(v) && v > 0 ? Math.floor(v) : def;
}

export const REPO_ROOT = env("WORKFLOW_REPO_ROOT", process.cwd());

export const WORKTREE_BASE = env("WORKFLOW_BASE", join(homedir(), "worktrees"));

// Standalone feedback service (sync reads/writes via the admin API)
export const FEEDBACK_SERVICE_URL = env("FEEDBACK_SERVICE_URL", "https://feedback.graceliu.uk").replace(/\/+$/, "");
export const FEEDBACK_APP_ID = env("FEEDBACK_APP_ID", "tt-learning-library");

export const GH_REPO = env("WORKFLOW_GH_REPO", ""); // "owner/repo"; auto-detected if empty
export const GH_LABELS = env("WORKFLOW_GH_LABELS", "workflow,triage"); // comma list

export const MAX_ROUNDS = intEnv("WORKFLOW_MAX_ROUNDS", 3);

// Models — pi-ollama-cloud registers these into the registry at session bootstrap.
export const TRIAGE_MODEL: ModelSpec = {
  provider: env("WORKFLOW_TRIAGE_PROVIDER", "ollama-cloud"),
  id: env("WORKFLOW_TRIAGE_MODEL", "deepseek-v4-pro"),
  thinking: env("WORKFLOW_TRIAGE_THINKING", "medium") as ModelSpec["thinking"],
};

export const PLAN_MODEL: ModelSpec = {
  provider: env("WORKFLOW_PLAN_PROVIDER", "ollama-cloud"),
  id: env("WORKFLOW_PLAN_MODEL", "glm-5.2"),
  thinking: env("WORKFLOW_PLAN_THINKING", "high") as ModelSpec["thinking"],
};

export const IMPLEMENT_MODEL: ModelSpec = {
  provider: env("WORKFLOW_IMPLEMENT_PROVIDER", "ollama-cloud"),
  id: env("WORKFLOW_IMPLEMENT_MODEL", "deepseek-v4-pro"),
  thinking: env("WORKFLOW_IMPLEMENT_THINKING", "medium") as ModelSpec["thinking"],
};

export const REVIEW_MODEL: ModelSpec = {
  provider: env("WORKFLOW_REVIEW_PROVIDER", "ollama-cloud"),
  id: env("WORKFLOW_REVIEW_MODEL", "glm-5.2"),
  thinking: env("WORKFLOW_REVIEW_THINKING", "high") as ModelSpec["thinking"],
};