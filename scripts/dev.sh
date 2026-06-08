#!/bin/sh
set -eu

env_file="apps/.env"

if [ ! -f "$env_file" ]; then
  printf '%s\n' "Missing $env_file. Copy apps/.env.example to apps/.env before running pnpm dev." >&2
  exit 1
fi

set -a
. "./$env_file"
set +a

: "${OPENROUTER_API_KEY:?set OPENROUTER_API_KEY in apps/.env before running pnpm dev}"

export SPECRAFT_SECRET="${SPECRAFT_SECRET:-specraft-local-dev-secret}"
export SPECRAFT_DATA_DIR="${SPECRAFT_DATA_DIR:-${TMPDIR:-/tmp}/specraft-dev-data}"
export PORT="${PORT:-4174}"

exec pnpm -r --parallel --filter @specraft/backend --filter @specraft/frontend dev
