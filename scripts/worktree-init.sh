#!/usr/bin/env bash
#
# worktree-init.sh — Automatic initialization for git worktrees
#
# Sets up a new worktree with:
#   - .env generated from .env.example with unique ports
#   - .env.local symlinked from main worktree (for secrets)
#   - bun install
#
# Safe to run multiple times (idempotent).

set -euo pipefail

# --- Worktree detection ---
# git-common-dir points to the shared .git of the main checkout.
# git-dir points to this worktree's .git link/directory.
# If they resolve to the same place, we are in the main checkout — skip.
GIT_COMMON_DIR="$(git rev-parse --git-common-dir 2>/dev/null)"
GIT_DIR="$(git rev-parse --git-dir 2>/dev/null)"

# Resolve to absolute paths for reliable comparison
GIT_COMMON_DIR="$(cd "$GIT_COMMON_DIR" && pwd)"
GIT_DIR="$(cd "$GIT_DIR" && pwd)"

if [ "$GIT_COMMON_DIR" = "$GIT_DIR" ]; then
  # Main checkout — nothing to do
  exit 0
fi

echo "[worktree-init] Detected git worktree, initializing..."

# --- Resolve paths ---
WORKTREE_ROOT="$(git rev-parse --show-toplevel)"
# Main worktree is the parent of .git/worktrees/
MAIN_WORKTREE="$(cd "$GIT_COMMON_DIR/.." && pwd)"

# --- Port assignment ---
# Hash the worktree directory name to get a deterministic offset.
# This ensures each worktree always gets the same ports.
WORKTREE_NAME="$(basename "$WORKTREE_ROOT")"
HASH=$(echo -n "$WORKTREE_NAME" | cksum | cut -d' ' -f1)
OFFSET=$(( (HASH % 100 + 1) * 10 ))

API_PORT=$(( 3000 + OFFSET ))
VITE_PORT=$(( 5173 + OFFSET ))
POSTGRES_PORT=$(( 5432 + OFFSET ))
DBHUB_PORT=$(( 8080 + OFFSET ))

# Sanitize worktree name for use as a database name suffix (lowercase, replace non-alphanumeric with _)
DB_SUFFIX=$(echo "$WORKTREE_NAME" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/_/g')

echo "[worktree-init] Worktree: $WORKTREE_NAME"
echo "[worktree-init] API port: $API_PORT, Vite port: $VITE_PORT, PG port: $POSTGRES_PORT, DBHub port: $DBHUB_PORT, DB: ws_scoring_$DB_SUFFIX"

# --- Generate .env from .env.example ---
if [ -f "$WORKTREE_ROOT/.env" ]; then
  echo "[worktree-init] .env already exists, skipping generation"
else
  ENV_EXAMPLE="$MAIN_WORKTREE/.env.example"
  if [ ! -f "$ENV_EXAMPLE" ]; then
    echo "[worktree-init] WARNING: $ENV_EXAMPLE not found, cannot generate .env"
  else
    echo "[worktree-init] Generating .env from .env.example with ports API=$API_PORT, Vite=$VITE_PORT"
    sed \
      -e "s|^PORT=.*|PORT=$API_PORT|" \
      -e "s|^CORS_ALLOWED_ORIGIN=.*|CORS_ALLOWED_ORIGIN=http://localhost:$VITE_PORT|" \
      -e "s|^API_TARGET=.*|API_TARGET=http://localhost:$API_PORT|" \
      -e "s|^VITE_DEV_PORT=.*|VITE_DEV_PORT=$VITE_PORT|" \
      -e "s|^VITE_API_PORT=.*|VITE_API_PORT=$API_PORT|" \
      -e "s|^POSTGRES_DB=.*|POSTGRES_DB=ws_scoring_$DB_SUFFIX|" \
      -e "s|^POSTGRES_PORT=.*|POSTGRES_PORT=$POSTGRES_PORT|" \
      -e "s|localhost:5432/ws_scoring|localhost:$POSTGRES_PORT/ws_scoring_$DB_SUFFIX|" \
      -e "s|^DBHUB_PORT=.*|DBHUB_PORT=$DBHUB_PORT|" \
      "$ENV_EXAMPLE" > "$WORKTREE_ROOT/.env"
    echo "[worktree-init] .env generated"
  fi
fi

# --- Symlink .env.local from main worktree ---
if [ -e "$WORKTREE_ROOT/.env.local" ]; then
  echo "[worktree-init] .env.local already exists, skipping symlink"
else
  if [ -f "$MAIN_WORKTREE/.env.local" ]; then
    ln -s "$MAIN_WORKTREE/.env.local" "$WORKTREE_ROOT/.env.local"
    echo "[worktree-init] .env.local symlinked from main worktree"
  else
    echo "[worktree-init] WARNING: No .env.local in main worktree ($MAIN_WORKTREE/.env.local)"
    echo "[worktree-init]          Secrets will not be available until you create it."
  fi
fi

# --- Install dependencies ---
echo "[worktree-init] Running bun install..."
cd "$WORKTREE_ROOT"
bun install

echo "[worktree-init] Done! Worktree is ready at $WORKTREE_ROOT"
echo "[worktree-init] Start dev servers with: bun run dev:api & bun run dev:app"
