 Plan: Automatic Git Worktree Initialization

 Goal

 When git worktree add creates a new worktree, automatically initialize it with:
 - .env generated from .env.example with unique ports
 - .env.local symlinked from main worktree (for secrets)
 - bun install run automatically
 - Port isolation so multiple worktrees can run dev servers simultaneously

 Files to Change
 File: scripts/worktree-init.sh
 Action: CREATE
 Purpose: Main init script (worktree detection, port assignment, .env generation, symlink, bun install)
 ────────────────────────────────────────
 File: .husky/post-checkout
 Action: CREATE
 Purpose: Git hook that triggers init script on branch checkout
 ────────────────────────────────────────
 File: .env.example
 Action: MODIFY
 Purpose: Add VITE_DEV_PORT=5173 and VITE_API_PORT=3000
 ────────────────────────────────────────
 File: vite.config.ts
 Action: MODIFY
 Purpose: Read port from VITE_DEV_PORT env var instead of hardcoded 5173
 ────────────────────────────────────────
 File: server.ts
 Action: MODIFY
 Purpose: Dynamic CORS origin using VITE_DEV_PORT instead of hardcoded 5173
 ────────────────────────────────────────
 File: .envrc
 Action: MODIFY
 Purpose: Add dotenv_if_exists .env.local to load secrets
 ────────────────────────────────────────
 File: src/app/utils/websocket.ts
 Action: MODIFY
 Purpose: Use import.meta.env.VITE_API_PORT instead of hardcoded ports
 ────────────────────────────────────────
 File: src/app/utils/viewerUrl.ts
 Action: MODIFY
 Purpose: Use import.meta.env.VITE_API_PORT instead of hardcoded 3000
 Step 1: Add env vars to .env.example

 Add two new vars at the end:

 # Vite Dev Server Port (used by vite.config.ts)
 VITE_DEV_PORT=5173

 # API port exposed to frontend for WebSocket direct connections
 VITE_API_PORT=3000

 Step 2: Make Vite port configurable in vite.config.ts

 // Add before defineConfig:
 const viteDevPort = process.env.VITE_DEV_PORT
   ? parseInt(process.env.VITE_DEV_PORT, 10)
   : 5173;

 // Change server.port from 5173 to viteDevPort

 Step 3: Dynamic CORS in server.ts

 Change line 24 from:
 const viteDevOrigin = "http://localhost:5173";
 to:
 const viteDevPort = process.env.VITE_DEV_PORT || "5173";
 const viteDevOrigin = `http://localhost:${viteDevPort}`;

 Step 4: Fix hardcoded ports in frontend utils

 src/app/utils/websocket.ts — Remove the isViteDevServer port check (redundant with import.meta.env.DEV), use
 VITE_API_PORT:

 export function getWebSocketUrl(path: string): string {
   if (import.meta.env.DEV) {
     const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
     const apiPort = import.meta.env.VITE_API_PORT || "3000";
     return `${protocol}//localhost:${apiPort}${path}`;
   }
   const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
   return `${protocol}//${window.location.host}${path}`;
 }

 src/app/utils/viewerUrl.ts — Use VITE_API_PORT:

 export function getViewerUrl(heatId: string): string {
   const baseUrl = import.meta.env.DEV
     ? `http://localhost:${import.meta.env.VITE_API_PORT || "3000"}`
     : "";
   return `${baseUrl}/viewer/${heatId}`;
 }

 Step 5: Update .envrc

 Change from:
 dotenv
 to:
 dotenv
 dotenv_if_exists .env.local

 Step 6: Create scripts/worktree-init.sh

 Key logic:
 1. Worktree detection: Compare git rev-parse --git-common-dir vs --git-dir. Equal = main checkout (skip). Different =
 worktree (proceed).
 2. Port assignment: Hash worktree directory name via cksum, compute offset ((hash % 100 + 1) * 10). API port = 3000 +
 offset, Vite port = 5173 + offset. Offset range 10-1010, so ports never collide with main worktree defaults.
 3. Generate .env: sed on .env.example replacing PORT, CORS_ALLOWED_ORIGIN, API_TARGET, VITE_DEV_PORT, VITE_API_PORT.
 Skip if .env already exists (idempotent).
 4. Symlink .env.local: From main worktree. Skip if already exists.
 5. Run bun install: Always safe to re-run.

 Step 7: Create .husky/post-checkout

 Minimal hook that delegates to scripts/worktree-init.sh:
 - Guard: skip file checkouts ($3 = 0)
 - The init script itself handles worktree-vs-main detection

 Step 8: Manual one-time migration (documented, not automated)

 Move secrets from .env to .env.local in the main worktree:
 - SCW_ACCESS_KEY, SCW_SECRET_KEY, SCW_DEFAULT_ORGANIZATION_ID, SCW_DEFAULT_PROJECT_ID
 - GITHUB_PERSONAL_ACCESS_TOKEN
 - Production DB connection string (commented out)

 Also add VITE_DEV_PORT=5173 and VITE_API_PORT=3000 to the main .env.

 Verification

 1. Run bun run test:all — all existing tests pass (port changes are backward-compatible with defaults)
 2. Run bun typecheck — no type errors
 3. Run bun format && bun check:fix — code formatted and linted
 4. Create a test worktree: git worktree add .worktrees/test-init -b test/worktree-init
 5. Verify .worktrees/test-init/.env was generated with unique ports
 6. Verify .worktrees/test-init/.env.local is a symlink (if main .env.local exists)
 7. Verify node_modules was installed in the worktree
 8. Clean up: git worktree remove .worktrees/test-init && git branch -D test/worktree-init

 Edge Cases Handled

 - Idempotent: Script skips if .env / .env.local already exist
 - Main checkout: Script detects and exits immediately (no-op on normal branch switches in main)
 - Missing .env.local: Warns but doesn't fail
 - Worktree removal: git worktree remove deletes everything, no orphaned files
 - Port collisions: Theoretically possible with hash-based assignment but extremely unlikely with <5 concurrent worktrees