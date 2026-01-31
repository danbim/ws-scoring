# Module Boundary Enforcement Design

**Date:** 2026-01-30
**Goal:** Make architectural boundaries explicit, enforced, and self-documenting so AI agents (and humans) can work with high velocity and high confidence.

## Problem

The codebase follows clean architecture principles (API → Domain ← Infrastructure), but boundaries are enforced only by convention. Two specific violations exist:

1. **`heat-service.ts`** imports `getDb()` from infrastructure and starts its own transaction
2. **`bracket-service.ts`** dynamically imports `getDb()` from infrastructure and starts its own transaction

Additionally, repository implementations internally call `getDb()`, creating hidden coupling that makes it unclear who owns the database connection lifecycle.

Without enforcement, AI agents and contributors can introduce new boundary violations without any feedback until code review.

## Design

### Part 1: Repository Refactor — Connection Injection

**Current state:** Repository implementations call `getDb()` internally. Methods accept an optional `tx` parameter for transactional operations.

**Target state:** Repositories receive their database connection at construction time. No repository ever calls `getDb()`.

#### New type in `infrastructure/db/index.ts`

```typescript
export type DbConnection = DbType | DbTransaction;
```

`DbConnection` is a union of the database instance and the transaction type. Both support the same query API (`.select()`, `.insert()`, `.update()`, `.delete()`), so repositories can use either interchangeably.

#### Factory functions change signature

```typescript
// Before
export function createHeatRepository(): HeatRepository {
  return new HeatRepositoryImpl();
}

// After
export function createHeatRepository(conn: DbConnection): HeatRepository {
  return new HeatRepositoryImpl(conn);
}
```

All factory functions in `infrastructure/repositories/index.ts` follow this pattern.

#### Repository implementations use injected connection

```typescript
// Before
class HeatRepositoryImpl implements HeatRepository {
  async getHeatByHeatId(heatId: string, tx?: DbTransaction): Promise<Heat | null> {
    const db = tx ?? (await getDb());
    // query using db...
  }
}

// After
class HeatRepositoryImpl implements HeatRepository {
  constructor(private conn: DbConnection) {}

  async getHeatByHeatId(heatId: string): Promise<Heat | null> {
    // query using this.conn...
  }
}
```

The optional `tx` parameter is removed from individual methods. When the caller needs transactional guarantees, they create the repository with `tx` instead of `db`.

#### Domain repository interfaces simplify

`DbTransaction` is removed from repository interface method signatures. Before:

```typescript
export interface HeatRepository {
  getHeatByHeatId(heatId: string, tx?: DbTransaction): Promise<Heat | null>;
  markCompleted(heatId: string, completedAt: Date, tx: DbTransaction): Promise<void>;
}
```

After:

```typescript
export interface HeatRepository {
  getHeatByHeatId(heatId: string): Promise<Heat | null>;
  markCompleted(heatId: string, completedAt: Date): Promise<void>;
}
```

This removes the `import type { DbTransaction }` from domain repository files entirely.

### Part 2: Domain Service Refactor — Remove Infrastructure Coupling

**Current state:** `HeatService.completeHeat()` and `generateBracketForDivision()` call `getDb()` to start transactions.

**Target state:** Domain services contain only business logic. Transaction lifecycle is owned by the API layer.

#### `heat-service.ts`

Remove `getDb()` import. Remove the `completeHeat`/`completeHeatInternal` split. The service just does business logic:

```typescript
export class HeatService {
  constructor(
    private heatRepository: HeatRepository,
    private scoreRepository: ScoreRepository
  ) {}

  async completeHeat(heatId: string, completedAt: Date): Promise<void> {
    await this.heatRepository.markCompleted(heatId, completedAt);
    const scores = await this.scoreRepository.getScoresByHeatId(heatId);
    const heat = await this.heatRepository.getHeatByHeatId(heatId);
    if (!heat) throw new HeatDoesNotExistError(heatId);

    const totals = calculateRiderScoreTotals(scores, heat.wavesCounting, heat.jumpsCounting);
    if (totals.length === 0) return;

    const winner = totals[0];
    const loser = totals.length > 1 ? totals[1] : null;
    const metadata = await this.heatRepository.getHeatMetadata(heatId);

    if (metadata?.winnerDestinationHeatId) {
      await this.heatRepository.addRiderToHeat(metadata.winnerDestinationHeatId, winner.riderId);
    }
    if (loser && metadata?.loserDestinationHeatId) {
      await this.heatRepository.addRiderToHeat(metadata.loserDestinationHeatId, loser.riderId);
    }
  }
}
```

#### `bracket-service.ts`

Remove dynamic `import("../../infrastructure/db/index.js")`. Remove `useTransaction` option. The function becomes pure business logic:

```typescript
export async function generateBracketForDivision(
  divisionId: string,
  repositories: {
    divisionRepository: DivisionRepository;
    bracketRepository: BracketRepository;
    divisionParticipantRepository: DivisionParticipantRepository;
    heatRepository: HeatRepository;
  }
): Promise<string> {
  // Pure business logic — no transaction management
}
```

#### API handlers own transactions

```typescript
// Heat completion
handler(async ({ input }) => {
  const db = await getDb();
  await db.transaction(async (tx) => {
    const heatRepo = createHeatRepository(tx);
    const scoreRepo = createScoreRepository(tx);
    const heatService = new HeatService(heatRepo, scoreRepo);
    await heatService.completeHeat(input.heatId, new Date());
  });
  await broadcastHeatUpdate(input.heatId);
  await broadcastHeadJudgeUpdate(input.heatId);
  return { message: "Heat completed successfully" };
});

// Bracket generation
handler(async ({ input }) => {
  const db = await getDb();
  const bracketId = await db.transaction(async (tx) => {
    return generateBracketForDivision(input.divisionId, {
      divisionRepository: createDivisionRepository(tx),
      bracketRepository: createBracketRepository(tx),
      divisionParticipantRepository: createDivisionParticipantRepository(tx),
      heatRepository: createHeatRepository(tx),
    });
  });
  return { bracketId };
});
```

### Part 3: Biome Enforcement — Editor-Time Feedback

Add `noRestrictedImports` overrides to `biome.json` as tripwires. These use `warn` level because Biome cannot distinguish `import type` from `import`:

```jsonc
{
  "overrides": [
    // ... existing overrides ...
    {
      "includes": ["src/domain/**"],
      "linter": {
        "rules": {
          "style": {
            "noRestrictedImports": {
              "level": "warn",
              "options": {
                "paths": {
                  "../../infrastructure/db/index.js": "Domain must not import from infrastructure at runtime. See AGENTS.md Architecture Boundaries.",
                  "../../infrastructure/repositories/index.js": "Domain must not import from infrastructure. Repositories are injected.",
                  "../../infrastructure/db/schema.js": "Domain must not import DB schema directly."
                }
              }
            }
          }
        }
      }
    },
    {
      "includes": ["src/infrastructure/**"],
      "linter": {
        "rules": {
          "style": {
            "noRestrictedImports": {
              "level": "error",
              "options": {
                "paths": {
                  "../../api/": "Infrastructure must not import from API layer.",
                  "../../app/": "Infrastructure must not import from app layer."
                }
              }
            }
          }
        }
      }
    }
  ]
}
```

After Part 1 and Part 2 are complete, the domain layer will have zero imports from infrastructure (including type-only), so the Biome rule level can be upgraded from `warn` to `error`.

### Part 4: CI Boundary Check Script

A script that catches what Biome can't — any runtime import crossing a boundary, regardless of path spelling.

**`scripts/check-boundaries.ts`**

Rules encoded:

| Source | Forbidden Target | Type-only Allowed? |
|--------|-----------------|-------------------|
| `domain/` | `infrastructure/` | No (after refactor, not needed) |
| `domain/` | `api/` | No |
| `domain/` | `app/` | No |
| `infrastructure/` | `api/` | No |
| `infrastructure/` | `app/` | No |

The script:
1. Globs files matching each rule's source pattern
2. Reads each file line by line
3. Tests against a regex that matches `import` but not `import type`
4. Reports violations with file path, line number, and the offending line
5. Exits non-zero if any violations found

Key regex: `^import\s+(?!type\s)` — matches runtime imports, skips type-only imports.

Add to `package.json`:

```json
"check:boundaries": "bun scripts/check-boundaries.ts"
```

### Part 5: Documentation Updates

#### AGENTS.md

Add an "Architecture Boundaries" section after "Domain-Driven Design Patterns":

```markdown
### Architecture Boundaries (ENFORCED)

The dependency graph is strictly directional. Violations fail CI via `bun run check:boundaries`.

**Allowed dependencies:**
- `api/` → `domain/`, `infrastructure/`
- `infrastructure/` → `domain/` (implements interfaces defined in domain)
- `app/` → `domain/` (types and pure functions only), `api/` (router type only)
- `domain/` → `domain/` (cross-module imports)

**Forbidden dependencies:**
- `domain/` → `infrastructure/`, `api/`, `app/`
- `infrastructure/` → `api/`, `app/`

**Transaction ownership:**
- API handlers start and commit/rollback transactions via `db.transaction()`
- Domain services never call `getDb()` or manage transactions
- Repositories receive their connection at construction: `createHeatRepository(db)` or `createHeatRepository(tx)`
- For transactional operations, create repositories with `tx`

**When reviewing code, verify:**
1. No runtime imports crossing forbidden boundaries
2. Domain services don't call `getDb()` or `db.transaction()`
3. Repositories don't call `getDb()` — connection is injected via factory
4. Transaction scope is owned by the API handler
```

Update the pre-commit checklist to include `bun run check:boundaries`.

Update the "Common Pitfalls" section to add:

```markdown
❌ **Don't** import from `infrastructure/` in domain code → Inject dependencies instead
❌ **Don't** start transactions in domain services → API handlers own transaction lifecycle
❌ **Don't** call `getDb()` in repositories → Accept connection via constructor
```

#### CLAUDE.md

Add under "Development Workflow":

```markdown
### Architecture Boundary Checks
- `bun run check:boundaries` - Verify no forbidden cross-layer imports
- See AGENTS.md "Architecture Boundaries" section for full dependency rules
- Domain must never have runtime imports from infrastructure, api, or app
- Transaction ownership belongs to API handlers, not domain services
```

Update the "Before Every Commit" checklist to include `bun run check:boundaries`.

## Files Changed

| File | Change |
|------|--------|
| `src/infrastructure/db/index.ts` | Add `DbConnection` type export |
| `src/infrastructure/repositories/index.ts` | Factory functions accept `DbConnection` parameter |
| `src/infrastructure/repositories/*.ts` | Constructor injection, remove `getDb()` calls |
| `src/domain/heat/repositories.ts` | Remove `DbTransaction` import, remove `tx` params |
| `src/domain/contest/repositories.ts` | Remove `DbTransaction` import, remove `tx` params |
| `src/domain/heat/heat-service.ts` | Remove `getDb()`, simplify `completeHeat` |
| `src/domain/bracket/bracket-service.ts` | Remove `getDb()`, remove `useTransaction` option |
| `src/api/orpc/routes/heats.ts` | Own transaction for `completeHeat` |
| `src/api/orpc/routes/brackets.ts` | Own transaction for `generateBracketForDivision` |
| `src/api/routes/heat-routes.ts` | Own transaction for `handleCompleteHeat` |
| `src/api/routes/bracket-routes.ts` | Own transaction for `handleGenerateBracket` |
| `scripts/db/seed.ts` | Pass `db`/`tx` to factory functions |
| `biome.json` | Add `noRestrictedImports` overrides |
| `scripts/check-boundaries.ts` | New boundary enforcement script |
| `package.json` | Add `check:boundaries` script |
| `AGENTS.md` | Add Architecture Boundaries section, update checklists |
| `CLAUDE.md` | Add boundary check to workflow, update checklists |
| `__tests__/**` | Update test setup to pass connections to factories |

## Implementation Order

1. **Add `DbConnection` type** to `infrastructure/db/index.ts`
2. **Refactor repository factories and implementations** — inject connection
3. **Update all API handlers** — pass `db` to factory functions
4. **Update all tests** — pass test db to factory functions
5. **Refactor `heat-service.ts`** — remove `getDb()`, simplify transaction handling
6. **Refactor `bracket-service.ts`** — remove `getDb()` and `useTransaction`
7. **Move transaction ownership** to API handlers for `completeHeat` and `generateBracketForDivision`
8. **Remove deprecated `completeHeat`** from `heat-repository.ts`
9. **Add Biome overrides** to `biome.json`
10. **Add `check-boundaries.ts`** script and `package.json` entry
11. **Update AGENTS.md and CLAUDE.md**
12. **Run full test suite and boundary check** to verify
