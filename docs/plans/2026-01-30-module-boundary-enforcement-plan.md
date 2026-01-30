# Module Boundary Enforcement Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enforce clean architecture boundaries (API → Domain ← Infrastructure) with connection injection, transaction ownership at API layer, Biome lint rules, a CI boundary-check script, and documentation.

**Architecture:** Repositories receive their database connection at construction via factory functions. Domain services never call `getDb()` or manage transactions. API handlers own transaction lifecycle. Boundaries are enforced by Biome lint rules (editor-time) and a CI script (build-time).

**Tech Stack:** Bun, TypeScript, Drizzle ORM, Biome, SolidJS

**Design Doc:** `docs/plans/2026-01-30-module-boundary-enforcement-design.md`

---

### Task 1: Add `DbConnection` type and update factory signatures

**Files:**
- Modify: `src/infrastructure/db/index.ts:41-44`
- Modify: `src/infrastructure/repositories/index.ts`

**Step 1: Add `DbConnection` type**

In `src/infrastructure/db/index.ts`, add after line 44 (`export type DbType = ...`):

```typescript
export type DbConnection = DbType | DbTransaction;
```

**Step 2: Update all factory functions to accept `DbConnection`**

In `src/infrastructure/repositories/index.ts`, add import and update every factory:

```typescript
import type { DbConnection } from "../db/index.js";

export function createUserRepository(conn: DbConnection): UserRepository {
  return new UserRepositoryImpl(conn);
}

export function createSessionRepository(conn: DbConnection): SessionRepository {
  return new SessionRepositoryImpl(conn);
}

export function createSeasonRepository(conn: DbConnection): SeasonRepository {
  return new SeasonRepositoryImpl(conn);
}

export function createContestRepository(conn: DbConnection): ContestRepository {
  return new ContestRepositoryImpl(conn);
}

export function createDivisionRepository(conn: DbConnection): DivisionRepository {
  return new DivisionRepositoryImpl(conn);
}

export function createBracketRepository(conn: DbConnection): BracketRepository {
  return new BracketRepositoryImpl(conn);
}

export function createRiderRepository(conn: DbConnection): RiderRepository {
  return new RiderRepositoryImpl(conn);
}

export function createDivisionParticipantRepository(conn: DbConnection): DivisionParticipantRepository {
  return new DivisionParticipantRepositoryImpl(conn);
}

export function createHeatRepository(conn: DbConnection): HeatRepository {
  return new HeatRepositoryImpl(conn);
}

export function createScoreRepository(conn: DbConnection): ScoreRepository {
  return new ScoreRepositoryImpl(conn);
}
```

**Step 3: Verify types compile**

Run: `bun typecheck`
Expected: Type errors in repository implementations (no constructor yet) and callers (missing arg). This is expected — we'll fix them in subsequent tasks.

**Step 4: Commit**

```bash
git add src/infrastructure/db/index.ts src/infrastructure/repositories/index.ts
git commit -m "refactor: add DbConnection type and update factory signatures"
```

---

### Task 2: Refactor simple repository implementations (no tx params)

These repositories have the simplest pattern: they call `getDb()` in every method and never accept a `tx` parameter. Refactor them to use constructor injection.

**Files:**
- Modify: `src/infrastructure/repositories/user-repository.ts`
- Modify: `src/infrastructure/repositories/session-repository.ts`
- Modify: `src/infrastructure/repositories/season-repository.ts`
- Modify: `src/infrastructure/repositories/contest-repository.ts`
- Modify: `src/infrastructure/repositories/division-repository.ts`
- Modify: `src/infrastructure/repositories/rider-repository.ts` (contains `RiderRepositoryImpl` and `DivisionParticipantRepositoryImpl`)

**Step 1: Apply the same pattern to each file**

For each file, the transformation is mechanical:

1. Replace `import { getDb } from "../db/index.js"` with `import type { DbConnection } from "../db/index.js"`
2. Add constructor: `constructor(private conn: DbConnection) {}`
3. Replace every `const db = await getDb();` with `const db = this.conn;`
4. Remove `async` from the `getDb()` line if it was the only await (the method itself stays async for the DB query)

Example using `season-repository.ts` as template — before:

```typescript
import { getDb } from "../db/index.js";

export class SeasonRepositoryImpl implements SeasonRepository {
  async createSeason(input: CreateSeasonInput): Promise<Season> {
    const db = await getDb();
    // ...
  }
}
```

After:

```typescript
import type { DbConnection } from "../db/index.js";

export class SeasonRepositoryImpl implements SeasonRepository {
  constructor(private conn: DbConnection) {}

  async createSeason(input: CreateSeasonInput): Promise<Season> {
    const db = this.conn;
    // ...
  }
}
```

Apply this to all 6 files listed above. Note `rider-repository.ts` has TWO classes (`RiderRepositoryImpl` and `DivisionParticipantRepositoryImpl`) — both need constructors.

**Step 2: Verify types compile**

Run: `bun typecheck`
Expected: Still type errors in callers (missing `conn` arg) — that's expected.

**Step 3: Commit**

```bash
git add src/infrastructure/repositories/user-repository.ts \
  src/infrastructure/repositories/session-repository.ts \
  src/infrastructure/repositories/season-repository.ts \
  src/infrastructure/repositories/contest-repository.ts \
  src/infrastructure/repositories/division-repository.ts \
  src/infrastructure/repositories/rider-repository.ts
git commit -m "refactor: inject DbConnection into simple repository implementations"
```

---

### Task 3: Refactor transaction-aware repository implementations

These repositories currently accept optional `tx?: DbTransaction` on some methods. After refactor, the connection is injected at construction and the `tx` parameters are removed.

**Files:**
- Modify: `src/infrastructure/repositories/heat-repository.ts`
- Modify: `src/infrastructure/repositories/score-repository.ts`
- Modify: `src/infrastructure/repositories/bracket-repository.ts`

**Step 1: Refactor `score-repository.ts`**

1. Replace `import { type DbTransaction, getDb } from "../db/index.js"` with `import type { DbConnection } from "../db/index.js"`
2. Add constructor: `constructor(private conn: DbConnection) {}`
3. Remove `tx?: DbTransaction` from all method signatures
4. Replace `const db = tx ?? (await getDb());` with `const db = this.conn;`

**Step 2: Refactor `bracket-repository.ts`**

Same pattern as score-repository. Method `createBracket` loses its `tx?: DbTransaction` param.

**Step 3: Refactor `heat-repository.ts`**

This one is more complex:

1. Replace `import { type DbTransaction, getDb } from "../db/index.js"` with `import type { DbConnection } from "../db/index.js"`
2. Add constructor: `constructor(private conn: DbConnection) {}`
3. For methods with `tx?: DbTransaction` (optional): replace `const db = tx ?? (await getDb())` with `const db = this.conn;` and remove the `tx` param
4. For methods with `tx: DbTransaction` (required — `markCompleted`, `addRiderToHeat`, `getHeatRiderIds`, `getHeatMetadata`): remove the `tx` parameter, replace `tx.` with `this.conn.` (these methods used `tx` directly, not via `const db = ...`)
5. **Delete the deprecated `completeHeat` method** (lines 139-148) — it dynamically imports `HeatService` and `createScoreRepository`, which is the circular dependency we're eliminating. The API layer will own this flow directly.

**Step 4: Verify types compile**

Run: `bun typecheck`
Expected: Errors in domain interfaces (still have `tx` params) and callers. Expected.

**Step 5: Commit**

```bash
git add src/infrastructure/repositories/heat-repository.ts \
  src/infrastructure/repositories/score-repository.ts \
  src/infrastructure/repositories/bracket-repository.ts
git commit -m "refactor: inject DbConnection into transaction-aware repositories, remove deprecated completeHeat"
```

---

### Task 4: Update domain repository interfaces

Remove all `DbTransaction` references from domain layer. After this, domain has zero imports from infrastructure.

**Files:**
- Modify: `src/domain/heat/repositories.ts`
- Modify: `src/domain/contest/repositories.ts`
- (No changes to `src/domain/rider/repositories.ts` or `src/domain/user/repositories.ts` — they don't import `DbTransaction`)

**Step 1: Update `src/domain/heat/repositories.ts`**

1. Delete line 1: `import type { DbTransaction } from "../../infrastructure/db/index.js";`
2. Remove `tx?: DbTransaction` and `tx: DbTransaction` from all method signatures in `HeatRepository` and `ScoreRepository` interfaces
3. Remove `completeHeat` from `HeatRepository` interface (deprecated method was deleted in Task 3)

The interface methods become:

```typescript
// HeatRepository changes:
getHeatByHeatId(heatId: string): Promise<Heat | null>;  // was: tx?: DbTransaction
createHeatWithBracketMetadata(data: {...}): Promise<void>;  // was: tx?: DbTransaction
markCompleted(heatId: string, completedAt: Date): Promise<void>;  // was: tx: DbTransaction
addRiderToHeat(heatId: string, riderId: string): Promise<void>;  // was: tx: DbTransaction
getHeatRiderIds(heatId: string): Promise<string[]>;  // was: tx: DbTransaction
getHeatMetadata(heatId: string): Promise<{...} | null>;  // was: tx: DbTransaction

// ScoreRepository changes:
insertScore(score: InsertScoreInput): Promise<void>;  // was: tx?: DbTransaction
getScoresByHeatId(heatId: string): Promise<Score[]>;  // was: tx?: DbTransaction
getScoreByUuid(scoreUuid: string): Promise<Score | null>;  // was: tx?: DbTransaction
updateScore(scoreUuid: string, updates: UpdateScoreInput): Promise<void>;  // was: tx?: DbTransaction
deleteScore(scoreUuid: string): Promise<void>;  // was: tx?: DbTransaction
```

**Step 2: Update `src/domain/contest/repositories.ts`**

1. Delete line 1: `import type { DbTransaction } from "../../infrastructure/db/index.js";`
2. Remove `tx?: DbTransaction` from `BracketRepository.createBracket` signature:

```typescript
createBracket(input: CreateBracketInput): Promise<Bracket>;  // was: tx?: DbTransaction
```

**Step 3: Verify types compile**

Run: `bun typecheck`
Expected: Errors in domain services (still use `tx` params) and API callers. Expected.

**Step 4: Commit**

```bash
git add src/domain/heat/repositories.ts src/domain/contest/repositories.ts
git commit -m "refactor: remove DbTransaction from domain repository interfaces"
```

---

### Task 5: Refactor domain services — remove infrastructure coupling

**Files:**
- Modify: `src/domain/heat/heat-service.ts`
- Modify: `src/domain/bracket/bracket-service.ts`

**Step 1: Refactor `heat-service.ts`**

1. Delete lines 1-2 (the infrastructure imports):
   ```
   import type { DbTransaction } from "../../infrastructure/db/index.js";
   import { getDb } from "../../infrastructure/db/index.js";
   ```
2. Merge `completeHeat` and `completeHeatInternal` into one method. Remove `getDb()` call and transaction wrapper. Remove the `private completeHeatInternal` and `private advanceRider` methods. The single `completeHeat` method becomes:

```typescript
async completeHeat(heatId: string, completedAt: Date): Promise<void> {
  // 1. Mark heat completed
  await this.heatRepository.markCompleted(heatId, completedAt);

  // 2. Calculate winner/loser from scores
  const scores = await this.scoreRepository.getScoresByHeatId(heatId);
  const heat = await this.heatRepository.getHeatByHeatId(heatId);

  if (!heat) {
    throw new HeatDoesNotExistError(heatId);
  }

  const totals = calculateRiderScoreTotals(scores, heat.wavesCounting, heat.jumpsCounting);

  if (totals.length === 0) {
    return; // No riders, nothing to advance
  }

  const winner = totals[0];
  const loser = totals.length > 1 ? totals[1] : null;

  // 3. Get metadata and advance riders
  const metadata = await this.heatRepository.getHeatMetadata(heatId);

  if (metadata?.winnerDestinationHeatId) {
    await this.heatRepository.addRiderToHeat(metadata.winnerDestinationHeatId, winner.riderId);
  }

  if (loser && metadata?.loserDestinationHeatId) {
    await this.heatRepository.addRiderToHeat(metadata.loserDestinationHeatId, loser.riderId);
  }
}
```

**Step 2: Refactor `bracket-service.ts`**

1. Delete line 1: `import type { DbTransaction } from "../../infrastructure/db/index.js";`
2. Remove the `options?: { useTransaction?: boolean }` parameter
3. Remove the `const useTransaction = options?.useTransaction ?? true;` line
4. Remove the transaction-wrapping logic (the `if (useTransaction)` / `else` block at lines 119-172)
5. The `createBracketWithHeats` inner function no longer takes `tx?: DbTransaction`, and the bye-heat completion logic runs inline. The function body becomes the main function body (no wrapper):

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
  const { divisionRepository, bracketRepository, divisionParticipantRepository, heatRepository } =
    repositories;

  // Validate division exists
  const division = await divisionRepository.getDivisionById(divisionId);
  if (!division) {
    throw new DivisionNotFoundError(divisionId);
  }

  // Check if bracket already exists
  const existingBracket = await bracketRepository.getBracketByDivisionId(divisionId);
  if (existingBracket) {
    throw new BracketAlreadyExistsError(divisionId);
  }

  // Get participants
  const riderIds = await divisionParticipantRepository.getRiderIdsByDivisionId(divisionId);
  if (riderIds.length < 2) {
    throw new InsufficientParticipantsError(riderIds.length);
  }

  if (riderIds.length > 64) {
    throw new Error(`Division has ${riderIds.length} participants, maximum is 64`);
  }

  // Generate bracket structure
  const bracketStructure = generateSingleEliminationBracket(riderIds);

  // Create bracket record
  const bracket = await bracketRepository.createBracket({
    divisionId,
    name: "Single Elimination",
    format: "single_elimination",
    status: "in_progress",
  });

  // Create all heats in reverse order (finals first) so that foreign key constraints are satisfied
  for (const round of bracketStructure.rounds.slice().reverse()) {
    for (const heatSpec of round.heats) {
      const heatId = `bracket-${bracket.id}-${heatSpec.position}`;

      let winnerDestinationHeatId: string | null = null;
      let loserDestinationHeatId: string | null = null;

      if (heatSpec.winnerDestinationPosition) {
        winnerDestinationHeatId = `bracket-${bracket.id}-${heatSpec.winnerDestinationPosition}`;
      }
      if (heatSpec.loserDestinationPosition) {
        loserDestinationHeatId = `bracket-${bracket.id}-${heatSpec.loserDestinationPosition}`;
      }

      await heatRepository.createHeatWithBracketMetadata({
        heatId,
        bracketId: bracket.id,
        riderIds: heatSpec.riderIds,
        wavesCounting: 2,
        jumpsCounting: 2,
        roundNumber: heatSpec.roundNumber,
        roundName: heatSpec.roundName,
        position: heatSpec.position,
        winnerDestinationHeatId,
        loserDestinationHeatId,
      });
    }
  }

  // Auto-complete bye heats and advance riders
  const completedHeats = new Set<string>();

  const completeByeHeat = async (heatId: string): Promise<void> => {
    if (completedHeats.has(heatId)) {
      return;
    }

    await heatRepository.markCompleted(heatId, new Date());
    completedHeats.add(heatId);

    const heatRiderIds = await heatRepository.getHeatRiderIds(heatId);
    if (heatRiderIds.length !== 1) {
      return;
    }

    const riderId = heatRiderIds[0];
    const metadata = await heatRepository.getHeatMetadata(heatId);
    if (!metadata?.winnerDestinationHeatId) {
      return;
    }

    await heatRepository.addRiderToHeat(metadata.winnerDestinationHeatId, riderId);
  };

  for (const round of bracketStructure.rounds) {
    for (const heatSpec of round.heats) {
      if (heatSpec.riderIds.length === 1) {
        const heatId = `bracket-${bracket.id}-${heatSpec.position}`;
        await completeByeHeat(heatId);
      }
    }
  }

  return bracket.id;
}
```

**Step 3: Verify types compile**

Run: `bun typecheck`
Expected: Errors in API callers (still call factories without `conn`, and `completeHeat` via repository). Expected.

**Step 4: Commit**

```bash
git add src/domain/heat/heat-service.ts src/domain/bracket/bracket-service.ts
git commit -m "refactor: remove infrastructure coupling from domain services"
```

---

### Task 6: Update API handlers — inject db, own transactions

This is the largest task. Every call to `createXRepository()` needs to pass a `db` connection. The `completeHeat` and `generateBracketForDivision` call sites need transaction wrappers.

**Files:**
- Modify: `src/api/orpc/routes/heats.ts`
- Modify: `src/api/orpc/routes/scores.ts`
- Modify: `src/api/orpc/routes/brackets.ts`
- Modify: `src/api/orpc/routes/seasons.ts`
- Modify: `src/api/orpc/routes/contests.ts`
- Modify: `src/api/orpc/routes/divisions.ts`
- Modify: `src/api/orpc/routes/riders.ts`
- Modify: `src/api/orpc/routes/participants.ts`
- Modify: `src/api/orpc/routes/auth.ts`
- Modify: `src/api/orpc/context.ts`
- Modify: `src/api/routes/heat-routes.ts`
- Modify: `src/api/routes/bracket-routes.ts`
- Modify: `src/api/routes/auth.ts`
- Modify: `src/api/routes/head-judge-routes.ts`
- Modify: `src/api/middleware/auth.ts`
- Modify: `src/api/websocket.ts`
- Modify: `src/api/websocket-head-judge.ts`

**Step 1: Add `getDb` import to each API file**

Each file that calls `createXRepository()` needs:

```typescript
import { getDb } from "../../../infrastructure/db/index.js";
// or relative path appropriate to the file's location
```

Many already import from `infrastructure/repositories/index.js`, so just add the db import.

**Step 2: Update simple handlers (non-transactional)**

For every handler that creates repositories and does non-transactional work, add `const db = await getDb();` at the top and pass `db` to each factory call.

Pattern — before:

```typescript
handler(async ({ input }) => {
  const seasonRepository = createSeasonRepository();
  return seasonRepository.getAllSeasons();
});
```

After:

```typescript
handler(async ({ input }) => {
  const db = await getDb();
  const seasonRepository = createSeasonRepository(db);
  return seasonRepository.getAllSeasons();
});
```

Apply to all handlers in: `seasons.ts`, `contests.ts`, `divisions.ts`, `riders.ts`, `participants.ts`, `auth.ts` (both legacy and orpc), `context.ts`.

**Step 3: Update `completeHeat` handlers (transactional)**

In `src/api/orpc/routes/heats.ts`, the `completeHeat` procedure currently calls `heatRepository.completeHeat()` (deprecated method). Replace with:

```typescript
export const completeHeat = authedProcedure
  .input(z.object({ heatId: z.string() }))
  .output(z.object({ message: z.string() }))
  .handler(async ({ input }) => {
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
```

Add import for `HeatService` and `getDb` at the top of the file.

In `src/api/routes/heat-routes.ts`, apply the same pattern to `handleCompleteHeat`:

```typescript
export async function handleCompleteHeat(heatId: string, _request: Request): Promise<Response> {
  return withErrorHandling(async () => {
    const db = await getDb();
    await db.transaction(async (tx) => {
      const heatRepo = createHeatRepository(tx);
      const scoreRepo = createScoreRepository(tx);
      const heatService = new HeatService(heatRepo, scoreRepo);
      await heatService.completeHeat(heatId, new Date());
    });

    await broadcastHeatUpdate(heatId);
    await broadcastHeadJudgeUpdate(heatId);

    return createSuccessResponse({ message: "Heat completed successfully" });
  }, "handleCompleteHeat");
}
```

Also update the `createHeatService()` helper in both `heat-routes.ts` and `scores.ts` to accept `db`:

```typescript
function createHeatService(conn: DbConnection): HeatService {
  return new HeatService(createHeatRepository(conn), createScoreRepository(conn));
}
```

And update all callers of `createHeatService()` to pass `db`.

**Step 4: Update `generateBracketForDivision` handlers (transactional)**

In `src/api/orpc/routes/brackets.ts`, wrap in transaction:

```typescript
export const generate = adminProcedure
  .input(z.object({ divisionId: z.string().uuid(), format: z.literal("single_elimination") }))
  .output(z.object({ bracketId: z.string() }))
  .handler(async ({ input }) => {
    const db = await getDb();

    try {
      const bracketId = await db.transaction(async (tx) => {
        return generateBracketForDivision(input.divisionId, {
          divisionRepository: createDivisionRepository(tx),
          bracketRepository: createBracketRepository(tx),
          divisionParticipantRepository: createDivisionParticipantRepository(tx),
          heatRepository: createHeatRepository(tx),
        });
      });
      return { bracketId };
    } catch (error) {
      // ... existing error handling
    }
  });
```

Same for `src/api/routes/bracket-routes.ts` `handleGenerateBracket`.

**Step 5: Update websocket and middleware files**

`websocket.ts`, `websocket-head-judge.ts`, `middleware/auth.ts` — add `const db = await getDb();` and pass `db` to factory calls.

For module-level factory calls like in `src/api/routes/auth.ts` (lines 17-18), these need to be moved into the handler functions since `getDb()` is async:

```typescript
// Before (module-level):
const userRepository = createUserRepository();
// After (inside handler):
const db = await getDb();
const userRepository = createUserRepository(db);
```

**Step 6: Run typecheck**

Run: `bun typecheck`
Expected: PASS (or errors only in test files — fixed in next task)

**Step 7: Commit**

```bash
git add src/api/
git commit -m "refactor: inject db connection in all API handlers, own transactions"
```

---

### Task 7: Update scripts

**Files:**
- Modify: `scripts/db/seed.ts`
- Modify: `scripts/users/*.ts` (create-user, delete-user, list-users, update-user, change-password)
- Modify: `scripts/seasons/*.ts`
- Modify: `scripts/contests/*.ts`
- Modify: `scripts/divisions/*.ts`
- Modify: `scripts/brackets/*.ts`

**Step 1: Update each script**

Add `import { getDb } from "../../src/infrastructure/db/index.js"` (adjust relative path per file), then `const db = await getDb();` at the start, and pass `db` to all factory calls.

For `seed.ts`, which calls `generateBracketForDivision`, wrap that call in a transaction:

```typescript
const db = await getDb();
await db.transaction(async (tx) => {
  await generateBracketForDivision(divisionId, {
    divisionRepository: createDivisionRepository(tx),
    bracketRepository: createBracketRepository(tx),
    divisionParticipantRepository: createDivisionParticipantRepository(tx),
    heatRepository: createHeatRepository(tx),
  });
});
```

**Step 2: Verify scripts run**

Run: `bun typecheck`
Expected: PASS (or errors only in test files)

**Step 3: Commit**

```bash
git add scripts/
git commit -m "refactor: inject db connection in all scripts"
```

---

### Task 8: Update tests

**Files:**
- Modify: `__tests__/test-db.ts`
- Modify: `__tests__/integration/bracket-generation.test.ts`
- Modify: `__tests__/api/auth-protected-routes.test.ts`
- Modify: `__tests__/api/bracket-routes.test.ts`
- Modify: `__tests__/api/heat-routes.test.ts`
- Modify: `__tests__/api/integration.test.ts`
- Modify: `__tests__/api/routes/head-judge-routes.test.ts`

**Step 1: Export test db instance from `test-db.ts`**

Add a `getTestDb()` function that returns the test db instance:

```typescript
export function getTestDb(): TestDbType {
  if (!testDbInstance) {
    throw new Error("Test database not initialized. Call setupTestDb() first.");
  }
  return testDbInstance;
}
```

**Step 2: Update integration tests**

In `bracket-generation.test.ts`, repositories are created at module level (lines 15-21). Move them into `beforeAll` or `beforeEach` after `setupTestDb()`:

```typescript
describe("Bracket Generation Integration Tests", () => {
  let seasonRepo: SeasonRepository;
  let contestRepo: ContestRepository;
  // ... etc

  beforeAll(async () => {
    const db = await setupTestDb();
    seasonRepo = createSeasonRepository(db);
    contestRepo = createContestRepository(db);
    divisionRepo = createDivisionRepository(db);
    riderRepo = createRiderRepository(db);
    participantRepo = createDivisionParticipantRepository(db);
    bracketRepo = createBracketRepository(db);
    heatRepo = createHeatRepository(db);
  });
```

Also, the test calls `generateBracketForDivision` with `{ useTransaction: false }` — that option no longer exists. Remove it. Since tests use PGlite and the repositories are already bound to the test db, transactions work normally.

**Step 3: Update API test files**

For tests that call factory functions inside handlers (e.g., `heat-routes.test.ts`, `bracket-routes.test.ts`), these tests hit the API through HTTP requests, so the handlers themselves call `getDb()`. Since `setupTestDb()` calls `setDbForTesting()`, the handlers will get the test db automatically via `getDb()`. These tests may not need changes to the factory calls within the test file itself — but any direct factory calls in test setup code need the db passed.

Check each test file: if it calls `createXRepository()` directly in test setup, pass `getTestDb()`:

```typescript
import { getTestDb } from "../test-db.js";

// In test setup:
const heatRepo = createHeatRepository(getTestDb());
```

**Step 4: Run all tests**

Run: `bun run test:all`
Expected: ALL PASS

**Step 5: Commit**

```bash
git add __tests__/
git commit -m "refactor: update tests to use injected db connections"
```

---

### Task 9: Add boundary enforcement — Biome rules

**Files:**
- Modify: `biome.json`

**Step 1: Add `noRestrictedImports` overrides**

Add two new entries to the `overrides` array in `biome.json`:

```jsonc
{
  "includes": ["src/domain/**"],
  "linter": {
    "rules": {
      "style": {
        "noRestrictedImports": {
          "level": "error",
          "options": {
            "paths": {
              "../../infrastructure/db/index.js": "Domain must not import from infrastructure. See AGENTS.md Architecture Boundaries.",
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
```

Note: Using `error` level (not `warn`) because after our refactor, domain has zero imports from infrastructure — there's no `import type` exception to worry about anymore.

**Step 2: Verify Biome passes**

Run: `bun check`
Expected: PASS — no domain files import from infrastructure anymore.

**Step 3: Commit**

```bash
git add biome.json
git commit -m "chore: add Biome noRestrictedImports rules for architecture boundaries"
```

---

### Task 10: Add CI boundary check script

**Files:**
- Create: `scripts/check-boundaries.ts`
- Modify: `package.json`

**Step 1: Write the boundary check script**

Create `scripts/check-boundaries.ts`:

```typescript
import { Glob } from "bun";

interface BoundaryRule {
  name: string;
  sourceGlob: string;
  forbiddenPattern: RegExp;
}

const RULES: BoundaryRule[] = [
  {
    name: "domain → infrastructure",
    sourceGlob: "src/domain/**/*.ts",
    forbiddenPattern: /from\s+["'][^"']*infrastructure[^"']*["']/,
  },
  {
    name: "domain → api",
    sourceGlob: "src/domain/**/*.ts",
    forbiddenPattern: /from\s+["'][^"']*\/api\/[^"']*["']/,
  },
  {
    name: "domain → app",
    sourceGlob: "src/domain/**/*.ts",
    forbiddenPattern: /from\s+["'][^"']*\/app\/[^"']*["']/,
  },
  {
    name: "infrastructure → api",
    sourceGlob: "src/infrastructure/**/*.ts",
    forbiddenPattern: /from\s+["'][^"']*\/api\/[^"']*["']/,
  },
  {
    name: "infrastructure → app",
    sourceGlob: "src/infrastructure/**/*.ts",
    forbiddenPattern: /from\s+["'][^"']*\/app\/[^"']*["']/,
  },
];

interface Violation {
  rule: string;
  file: string;
  line: number;
  text: string;
}

async function checkBoundaries(): Promise<Violation[]> {
  const violations: Violation[] = [];

  for (const rule of RULES) {
    const glob = new Glob(rule.sourceGlob);

    for await (const filePath of glob.scan({ cwd: "." })) {
      const file = Bun.file(filePath);
      const content = await file.text();
      const lines = content.split("\n");

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Skip type-only imports — these don't create runtime dependencies
        if (/^\s*import\s+type\s/.test(line)) {
          continue;
        }

        if (rule.forbiddenPattern.test(line)) {
          violations.push({
            rule: rule.name,
            file: filePath,
            line: i + 1,
            text: line.trim(),
          });
        }
      }
    }
  }

  return violations;
}

const violations = await checkBoundaries();

if (violations.length > 0) {
  console.error("\nBOUNDARY VIOLATIONS FOUND:\n");

  for (const v of violations) {
    console.error(`  ${v.rule}`);
    console.error(`    ${v.file}:${v.line}`);
    console.error(`    ${v.text}\n`);
  }

  console.error(`${violations.length} violation(s) found.`);
  process.exit(1);
} else {
  console.log("All architecture boundaries OK.");
  process.exit(0);
}
```

**Step 2: Add script to `package.json`**

Add to the `scripts` section:

```json
"check:boundaries": "bun scripts/check-boundaries.ts"
```

**Step 3: Run the check**

Run: `bun run check:boundaries`
Expected: `All architecture boundaries OK.` with exit code 0.

**Step 4: Commit**

```bash
git add scripts/check-boundaries.ts package.json
git commit -m "chore: add architecture boundary check script"
```

---

### Task 11: Update documentation

**Files:**
- Modify: `AGENTS.md`
- Modify: `CLAUDE.md`

**Step 1: Update AGENTS.md**

Add after the "Domain-Driven Design Patterns" section (around line 106):

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

Update the "Pre-commit Workflow" section to add `bun run check:boundaries` after the existing checks.

Add to "Common Pitfalls":

```markdown
❌ **Don't** import from `infrastructure/` in domain code → Inject dependencies instead
❌ **Don't** start transactions in domain services → API handlers own transaction lifecycle
❌ **Don't** call `getDb()` in repositories → Accept connection via constructor
```

Update "Database (Drizzle ORM)" section — replace the `DbTransaction` bullet:

```markdown
- **Connection injection**: Repositories receive `DbConnection` via factory: `createHeatRepository(db)`
- **Transactions**: API handlers own transaction scope: `db.transaction(async (tx) => { ... })`
```

**Step 2: Update CLAUDE.md**

Add under "Development Workflow" (after "Before Every Commit"):

```markdown
### Architecture Boundary Checks
- `bun run check:boundaries` - Verify no forbidden cross-layer imports
- See AGENTS.md "Architecture Boundaries" section for full dependency rules
- Domain must never have runtime imports from infrastructure, api, or app
- Transaction ownership belongs to API handlers, not domain services
```

Update the "Before Every Commit" numbered list to include:

```
5. `bun run check:boundaries` - Verify architecture boundaries
```

Update "Common Commands" testing section to include:

```
- `bun run check:boundaries` - Check architecture boundary violations
```

**Step 3: Commit**

```bash
git add AGENTS.md CLAUDE.md
git commit -m "docs: add architecture boundary rules to AGENTS.md and CLAUDE.md"
```

---

### Task 12: Final verification

**Step 1: Run all checks**

```bash
bun run test:all
bun format
bun check:fix
bun typecheck
bun run check:boundaries
```

All must pass with zero errors.

**Step 2: Verify no domain → infrastructure imports remain**

```bash
grep -r "from.*infrastructure" src/domain/ --include="*.ts"
```

Expected: Zero results.

**Step 3: Verify no `getDb()` calls in domain or repositories**

```bash
grep -r "getDb" src/domain/ src/infrastructure/repositories/ --include="*.ts"
```

Expected: Zero results.

**Step 4: Final commit if any formatting/lint fixes were applied**

```bash
git add -A
git commit -m "chore: final formatting and lint fixes after boundary enforcement refactor"
```
