# Agent Development Guide

This guide is for AI coding agents (Claude, Cursor, Copilot, etc.) working in this codebase.

**For detailed project documentation and workflows, see `CLAUDE.md`**

## Quick Reference

### Tool Paths
- **bun** (instead of node/npm): `~/.bun/bin/bun` (also in PATH)
- **tofu** (instead of terraform): `/opt/homebrew/bin/tofu`

### Pre-commit Workflow (REQUIRED)

Run these commands in order and fix ALL issues before committing. Repeat until all pass:

```bash
bun run test:all    # All tests must pass (backend + frontend)
bun format          # Format code with Biome
bun check:fix       # Lint and auto-fix with Biome
bun typecheck       # Fix all TypeScript errors
```

**Never commit without passing all four checks.**

## Essential Commands

### Development
```bash
bun run dev:api              # Start API server (port 3000, hot reload)
bun run dev:app              # Start Vite frontend (port 5173)
bun install                  # Install dependencies
```

### Testing
```bash
bun test                     # Backend/integration tests (PGlite in-memory DB)
bun test <path/to/test.ts>   # Run single backend test file
bun run test:components      # Frontend component tests (watch mode)
bun run test:components:run  # Frontend component tests (CI mode)
bun run test:all             # Run ALL tests (backend + frontend)
```

### Code Quality
```bash
bun typecheck                # TypeScript type checking
bun check                    # Biome lint (read-only)
bun check:fix                # Biome lint with auto-fix
bun format                   # Format code with Biome
```

### Database
```bash
bun run db:generate          # Generate Drizzle migrations
bun run db:migrate           # Run migrations
bun run db:reset             # Reset database
bun run db:seed              # Seed test data
```

**Database schema changes:** Run `bun run db:generate` and update scripts in `scripts/db/` if needed.

## Code Style Guidelines

### Imports
- **Use explicit `.js` extensions** (required by Bun): `from "../../domain/heat/index.js"`
- **Type-only imports**: `import type { HeatState } from "./types.js"`
- **Auto-organized** by Biome on format (source action: organizeImports)
- **Barrel exports** via `index.ts` files for public API

### Formatting (Biome)
- **Indentation**: 2 spaces
- **Line width**: 100 characters
- **Quotes**: Double quotes (`"`)
- **Semicolons**: Always (`;`)
- **Trailing commas**: ES5 style (arrays/objects only)

### TypeScript
- **Strict mode** enabled - no implicit any, strict null checks
- **Explicit return types** on exported functions
- **Interface** for object shapes: `interface HeatState { ... }`
- **Type** for unions/aliases: `type Score = WaveScore | JumpScore`
- **Discriminated unions**: Use `type` field for discrimination
- **Type exports**: Export types from `index.ts` barrel files
- **No `any`** in production code (allowed in `__tests__/**/*.test.ts` only)

### Naming Conventions
- **Files**: kebab-case (`heat-service.ts`, `error-handling.ts`)
- **Components**: PascalCase files (`Button.tsx`, `HeatCard.tsx`)
- **Types/Interfaces**: PascalCase (`HeatState`, `ScoreRepository`)
- **Functions**: camelCase (`calculateWaveTotal`, `handleCreateHeat`)
- **Constants**: UPPER_SNAKE_CASE (`DEFAULT_HEAT_RULES`, `MAX_WAVE_SCORE`)
- **Private helpers**: camelCase with descriptive names

### Error Handling
- **Custom error classes** extending `Error` (e.g., `HeatDoesNotExistError`)
- **Type guards** for domain errors: `isDomainError(error)`
- **Error middleware** wrapper: `withErrorHandling(async () => { ... })`
- **Domain errors** map to HTTP status codes (400/404/500)
- **Always log errors** with context

### Domain-Driven Design Patterns
- **Repository pattern**: Interfaces in `domain/`, implementations in `infrastructure/`
- **Service layer**: Business logic in `domain/*/service.ts`
- **Pure functions**: Score calculators, validators
- **Domain types** separate from API types
- **Validation** at API boundary using Zod schemas
- **Transactions**: PostgreSQL ACID guarantees via Drizzle ORM

### API Patterns
- **Handler functions**: `async function handleCreateHeat(request: Request): Promise<Response>`
- **Middleware composition**: `withValidation`, `withErrorHandling`, `withAuth`
- **Type-safe requests**: `Request & { user: { id: string } }` for authenticated routes
- **Response helpers**: `createSuccessResponse(data)`, `createErrorResponse(msg, status)`
- **Zod schemas** in `api/schemas.ts` for request validation

### Frontend (SolidJS)
- **Functional components**: `const MyComponent: Component<Props> = (props) => { ... }`
- **Reactive primitives**: Access via functions: `variant()`, `size()`, not `variant`
- **JSX**: Use `class` (not `className`), `for` (not `htmlFor`)
- **Props**: Don't destructure - use `props.variant` to preserve reactivity
- **Tailwind CSS**: Utility-first classes, avoid inline styles
- **Component composition**: Accept `children: JSX.Element` prop

### Database (Drizzle ORM)
- **Repository pattern** for all data access
- **Transactions**: Use `DbTransaction` type for transaction-aware methods
- **JSON columns**: Stringify arrays: `JSON.stringify(riderIds)`
- **Timestamps**: Include `createdAt`, `updatedAt`, `completedAt` where appropriate

## Testing Guidelines

### Backend/Integration Tests (Bun Test + PGlite)
- **Location**: `__tests__/api/`, `__tests__/domain/`, `__tests__/integration/`
- **Framework**: Bun test runner with PGlite in-memory PostgreSQL
- **Pattern**: Arrange-Act-Assert
- **Isolation**: Each test file gets isolated PGlite database

**Template:**
```typescript
import { describe, expect, it, beforeAll, afterAll, beforeEach } from "bun:test";
import { setupTestDb, teardownTestDb, clearTestData, getDb } from "../test-db.js";

describe("My Test Suite", () => {
  beforeAll(async () => {
    await setupTestDb();  // Setup isolated PGlite instance
  });

  afterAll(async () => {
    await teardownTestDb();  // Cleanup
  });

  beforeEach(async () => {
    await clearTestData();  // Clear data between tests
  });

  it("should do something", async () => {
    const db = await getDb();
    // Arrange, Act, Assert
  });
});
```

### Frontend Component Tests (Vitest + Solid Testing Library)
- **Location**: `__tests__/components/**/*.test.{ts,tsx}`
- **Framework**: Vitest with happy-dom
- **Query by**: Role, label, text (not test IDs or classes) for accessibility

**Template:**
```typescript
import { render, screen } from "@solidjs/testing-library";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

describe("MyComponent", () => {
  it("should handle user interaction", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(() => <MyComponent onSubmit={onSubmit} />);

    const button = screen.getByRole("button", { name: /submit/i });
    await user.click(button);

    expect(onSubmit).toHaveBeenCalled();
  });
});
```

**When to write component tests:**
- Complex UI logic (modals, forms, multi-step flows)
- User interactions requiring simulation
- Conditional rendering logic

**When NOT to write component tests:**
- Simple presentational components (just display props)
- Better tested via integration/E2E
- Pure styling/layout concerns

## Project Structure

```
src/
├── api/               # REST API layer
│   ├── routes/        # Route handlers
│   ├── middleware/    # Error handling, validation, auth
│   ├── schemas.ts     # Zod validation schemas
│   └── websocket*.ts  # WebSocket handlers
├── app/               # SolidJS frontend
│   ├── components/    # UI components
│   ├── pages/         # Page components
│   ├── contexts/      # State contexts
│   └── utils/         # Frontend utilities
├── domain/            # Domain-Driven Design
│   ├── heat/          # Heat scoring (core domain)
│   ├── contest/       # Contest management
│   ├── bracket/       # Bracket generation
│   └── */index.ts     # Public API exports
├── infrastructure/    # Infrastructure concerns
│   ├── db/            # Drizzle schema, migrations
│   └── repositories/  # Repository implementations
└── viewer/            # Standalone web component

__tests__/
├── api/               # API route tests
├── components/        # Component tests (Vitest)
├── domain/            # Domain logic tests
├── integration/       # Integration tests
├── test-db.ts         # PGlite utilities
└── setup.ts           # Vitest setup
```

## Quality Standards

- ✅ **All tests pass** before every commit
- ✅ **Zero type errors** - strict mode enabled
- ✅ **Formatted code** - Biome auto-format
- ✅ **No lint errors** - Biome recommended rules
- ✅ **Test coverage** - Write tests for new features
- ✅ **Follow patterns** - Check existing code first
- ✅ **Domain errors** - Use custom error classes, not generic Error
- ✅ **Type safety** - Explicit types, no implicit any

## Common Pitfalls

❌ **Don't** use `node` or `npm` → Use `bun`
❌ **Don't** forget `.js` extensions in imports
❌ **Don't** destructure SolidJS props → Breaks reactivity
❌ **Don't** use `className` in JSX → Use `class`
❌ **Don't** commit without passing all checks
❌ **Don't** use `any` type outside of tests
❌ **Don't** skip error logging
❌ **Don't** access dev database in tests → Use PGlite via test utilities
