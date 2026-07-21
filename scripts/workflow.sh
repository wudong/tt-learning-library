#!/usr/bin/env bash
# Run the fix-loop workflow. Resolves the globally-installed pi SDK via NODE_PATH
# so we don't need to add it to the project's lockfile.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NODE_PATH="${NODE_PATH:-/opt/homebrew/lib/node_modules}:${NODE_PATH:-}" \
  exec bun "$ROOT/scripts/workflow/run.ts" "$@"