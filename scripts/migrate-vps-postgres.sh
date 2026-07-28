#!/usr/bin/env bash
# ============================================================================
# Apply database migrations to the VPS PostgreSQL instance.
#
# Migrations are managed by Kysely (@ttll/db). The migrator applies pending
# migrations inside a PostgreSQL advisory lock. VPS-specific application role
# grants are applied afterwards.
#
# Usage:
#   DATABASE_URL=postgresql:///tt_learning ./scripts/migrate-vps-postgres.sh
# ============================================================================
set -euo pipefail

: "${DATABASE_URL:?Set DATABASE_URL to the VPS PostgreSQL connection string.}"

root_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
bun_bin="${BUN_BIN:-/usr/local/bin/bun}"
psql_cmd=(psql "$DATABASE_URL" --set=ON_ERROR_STOP=1)

# 1. Run pending Kysely migrations.
DATABASE_URL="$DATABASE_URL" "$bun_bin" "$root_dir/packages/db/src/migrations/run.ts"

# 2. Grant privileges to the restricted application role (VPS-specific).
"${psql_cmd[@]}" --file "$root_dir/infra/postgres/9999_application_grants.sql"
