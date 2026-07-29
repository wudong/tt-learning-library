import { existsSync, readFileSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { join } from 'node:path'

/**
 * Build provenance surfaced on /api/health so we can tell exactly which commit
 * is live, when it was built, and which GitHub Actions workflow produced it.
 *
 * In production the deploy workflow writes `apps/api/build-info.json` before
 * rsyncing to the VPS. In local dev we fall back to the working-tree git state.
 */
export interface BuildInfo {
  /** Git commit SHA the build was produced from. */
  commit: string | null
  /** Git ref (e.g. refs/heads/main) the build was produced from. */
  ref: string | null
  /** GitHub Actions workflow name that built it, or null for non-CI builds. */
  workflow: string | null
  /** GitHub Actions run id, or null for non-CI builds. */
  runId: string | null
  /** GitHub Actions run attempt, or null for non-CI builds. */
  runAttempt: string | null
  /** GitHub actor that triggered the build, or null for non-CI builds. */
  actor: string | null
  /** ISO 8601 timestamp the build was produced. */
  builtAt: string | null
  /** Where the provenance came from: build-info.json (CI), git (local dev), or none. */
  source: 'build-info.json' | 'git' | 'none'
}

const BUILD_INFO_PATH = join(process.cwd(), 'apps/api/build-info.json')

function git(command: string): string | null {
  try {
    const value = execSync(command, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()
    return value || null
  } catch {
    return null
  }
}

function fromFile(): BuildInfo | null {
  try {
    if (!existsSync(BUILD_INFO_PATH)) return null
    const parsed = JSON.parse(readFileSync(BUILD_INFO_PATH, 'utf8')) as Partial<BuildInfo>
    if (!parsed.commit) return null
    return {
      commit: parsed.commit ?? null,
      ref: parsed.ref ?? null,
      workflow: parsed.workflow ?? null,
      runId: parsed.runId ?? null,
      runAttempt: parsed.runAttempt ?? null,
      actor: parsed.actor ?? null,
      builtAt: parsed.builtAt ?? null,
      source: 'build-info.json',
    }
  } catch {
    return null
  }
}

function fromGit(): BuildInfo {
  const commit = git('git rev-parse HEAD')
  return {
    commit,
    ref: git('git rev-parse --abbrev-ref HEAD'),
    workflow: process.env.GITHUB_WORKFLOW ?? null,
    runId: process.env.GITHUB_RUN_ID ?? null,
    runAttempt: process.env.GITHUB_RUN_ATTEMPT ?? null,
    actor: process.env.GITHUB_ACTOR ?? null,
    builtAt: git('git log -1 --format=%cI'),
    source: commit ? 'git' : 'none',
  }
}

let cached: BuildInfo | null = null

export function getBuildInfo(): BuildInfo {
  if (cached) return cached
  cached = fromFile() ?? fromGit()
  return cached
}