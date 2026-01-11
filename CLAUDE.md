# Wave Scoring Application

## Tool Configuration

This project uses **bun** instead of node/npm:
- Location: `~/.bun/bin/bun` (also in PATH via `.claude/settings.json`)
- Package manager: `bun install`, `bun add`, `bun remove`
- Script runner: `bun run <script>`
- Test runner: `bun test`

This project uses **tofu** instead of terraform:
- Location: `/opt/homebrew/bin/tofu`
- All terraform commands should use `tofu` instead

## Development Workflow

### Before Every Commit (Required)

Run these commands in order and fix all issues before committing:

1. `bun test` - All tests must pass
2. `bun format` - Format code with Biome
3. `bun check:fix` - Lint and auto-fix issues with Biome
4. `bun typecheck` - Fix all TypeScript type errors and warnings

Repeat until all checks pass without errors.

### After Adding Features

Same workflow as above - test, format, lint, typecheck.

### Common Commands

**Development:**
- `bun run dev:api` - Start API server with hot reload
- `bun run dev:app` - Start Vite dev server for frontend
- `bun install` - Install dependencies

**Testing & Quality:**
- `bun test` - Run all tests with shuffle (uses PGlite for database tests)
- `bun test <path/to/test.ts>` - Run specific test file
- `bun typecheck` - TypeScript type checking
- `bun check` - Biome lint check (read-only)
- `bun check:fix` - Biome lint with auto-fix
- `bun format` - Format code with Biome

**Building:**
- `bun run build:app` - Build frontend with Vite
- `bun run build:docker` - Build Docker image

**Docker:**
- `bun run docker:dev` - Start development Docker Compose
- `bun run docker:dev:build` - Rebuild and start dev Docker
- `bun run docker:down` - Stop Docker services
- `bun run docker:logs` - View Docker logs

**Database:**
- `bun run db:generate` - Generate Drizzle migrations
- `bun run db:migrate` - Run migrations
- `bun run db:reset` - Reset database
- `bun run db:seed` - Seed database with test data
- `bun run db:seed:dry-run` - Preview seed data without applying

**Management Scripts:**
- `bun run users:create` - Create user
- `bun run users:list` - List all users
- `bun run seasons:create` - Create season
- `bun run contests:create` - Create contest
- `bun run divisions:create` - Create division
- `bun run brackets:create` - Create bracket

### Database Schema Changes

If database schemas are modified:
1. Run `bun run db:generate` to create migration files
2. Update any related scripts in `scripts/db/` if needed
3. Test migrations with `bun run db:migrate`

## For Claude Sub-Agents

### Tool Paths
- Use `bun` commands (PATH is configured via `.claude/settings.json`)
- Use `tofu` instead of `terraform`
- If a command is not found, use explicit paths:
  - `~/.bun/bin/bun`
  - `/opt/homebrew/bin/tofu`

### Pre-approved Permissions
The following tools are pre-approved in `.claude/settings.json`:
- All `bun` commands (both short form and full path)
- All `git` operations
- File operations (`Read`, `Write`, `Edit`)
- Docker commands
- Common utilities (`ls`, `find`, `curl`, `cut`)
- Superpowers skills

### Quality Standards
- **No commits without passing all checks** - Always run test, format, check:fix, typecheck
- **Fix type errors immediately** - TypeScript strict mode is enabled
- **Maintain test coverage** - Write tests for new features
- **Follow project patterns** - Check existing code before implementing new patterns

### Project Structure
- `src/` - Source code
  - `app/` - SolidJS frontend application
  - `domain/` - Domain logic and business rules
  - `api/` - API routes and handlers
  - `db/` - Database schema and migrations
- `__tests__/` - Test files (mirrors src/ structure)
  - `test-db.ts` - PGlite test database utilities
- `scripts/` - Management and utility scripts
- `docs/` - Documentation and design documents
- `.claude/` - Claude Code configuration

## Testing

### Test Database Isolation

Integration tests use **PGlite** (WASM-based in-memory PostgreSQL) for complete test isolation:

- ✅ **Zero side effects** - Tests never touch the development database
- ✅ **Complete isolation** - Each test file gets its own isolated database instance
- ✅ **Faster execution** - In-memory database with no network overhead
- ✅ **No dependencies** - Tests run without requiring PostgreSQL to be running
- ✅ **Full compatibility** - PGlite implements PostgreSQL 16 with complete schema support

### Running Tests

```bash
bun test              # Run all tests (no PostgreSQL required!)
bun test <path>       # Run specific test file
bun test --shuffle    # Run with randomized order (default)
```

### Writing Database Tests

For tests that need database access, use the test database utilities:

```typescript
import { setupTestDb, teardownTestDb, clearTestData } from "../test-db.js";

describe("My Test Suite", () => {
  // Setup isolated PGlite database for this test file
  beforeAll(async () => {
    await setupTestDb();
  });

  // Cleanup PGlite database after all tests
  afterAll(async () => {
    await teardownTestDb();
  });

  // Clear data between tests
  beforeEach(async () => {
    await clearTestData();

    // Insert test data
    const db = await getDb();
    await db.insert(someTable).values({...});
  });

  it("should test something", async () => {
    // Your test code - uses PGlite automatically via getDb()
  });
});
```

**Key Points:**
- Each test file gets its own isolated PGlite instance (set up in `beforeAll`)
- Data is cleared between tests (call `clearTestData()` in `beforeEach`)
- No existence checks needed - database starts empty after `clearTestData()`
- Use `getDb()` normally - it automatically returns the test database
- Tests are completely isolated from development database
