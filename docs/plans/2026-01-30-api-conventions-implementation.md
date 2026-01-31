# API Conventions Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Standardize all API route handlers to follow two canonical shapes, and centralize domain-to-HTTP error mapping via oRPC middleware — so agents can pattern-match any route by looking at any other route.

**Architecture:** Add a global `onError` interceptor to the base oRPC procedure that catches domain errors and maps them to ORPCError. Then refactor each route file to remove ad-hoc error handling (try/catch, helper functions) and use dedicated formatter functions. The `scores.ts` route is the most complex because it has `ensureHeatNotCompleted()` and `canEditScore()` helpers that need to move into the domain layer.

**Tech Stack:** oRPC (`@orpc/server`), Zod, Drizzle ORM, TypeScript strict mode, Bun Test

**Design doc:** `docs/plans/2026-01-30-api-conventions-design.md`

---

## Task 1: Create domain error mapping middleware

Create the centralized error mapper using oRPC's `onError` interceptor pattern, and wire it into the base procedures so ALL routes get automatic domain error mapping.

**Files:**
- Create: `src/api/orpc/domain-error-mapper.ts`
- Modify: `src/api/orpc/context.ts`

**Step 1: Create `src/api/orpc/domain-error-mapper.ts`**

```typescript
import { ORPCError, onError } from "@orpc/server";
import {
  BracketAlreadyExistsError,
  DivisionNotFoundError,
  InsufficientParticipantsError,
} from "../../domain/bracket/bracket-service.js";
import {
  HeatAlreadyExistsError,
  HeatCompletedError,
  HeatDoesNotExistError,
  InvalidHeatRulesError,
  NonUniqueRiderIdsError,
  RiderAlreadyInHeatError,
  RiderNotInHeatError,
  ScoreMustBeInValidRangeError,
  ScoreNotFoundError,
  ScoreTypeMismatchError,
  ScoreUUIDAlreadyExistsError,
} from "../../domain/heat/errors.js";

// biome-ignore lint/suspicious/noExplicitAny: error constructors have varying signatures
type ErrorConstructor = new (...args: any[]) => Error;

/**
 * Maps domain error classes to oRPC error codes.
 *
 * To add a new domain error:
 * 1. Create the error class in `domain/{entity}/errors.ts`
 * 2. Add one entry here: [ErrorClass, "STATUS_CODE"]
 */
const DOMAIN_ERROR_MAP: Array<[ErrorConstructor, string]> = [
  // 400 BAD_REQUEST — client violated a business rule
  [HeatAlreadyExistsError, "BAD_REQUEST"],
  [HeatCompletedError, "BAD_REQUEST"],
  [InvalidHeatRulesError, "BAD_REQUEST"],
  [NonUniqueRiderIdsError, "BAD_REQUEST"],
  [RiderAlreadyInHeatError, "BAD_REQUEST"],
  [RiderNotInHeatError, "BAD_REQUEST"],
  [ScoreMustBeInValidRangeError, "BAD_REQUEST"],
  [ScoreTypeMismatchError, "BAD_REQUEST"],
  [ScoreUUIDAlreadyExistsError, "BAD_REQUEST"],
  [BracketAlreadyExistsError, "BAD_REQUEST"],
  [InsufficientParticipantsError, "BAD_REQUEST"],

  // 404 NOT_FOUND — referenced entity doesn't exist
  [HeatDoesNotExistError, "NOT_FOUND"],
  [ScoreNotFoundError, "NOT_FOUND"],
  [DivisionNotFoundError, "NOT_FOUND"],
];

/**
 * oRPC onError interceptor that maps domain errors to ORPCError.
 * Applied to base procedures so all routes get automatic error mapping.
 */
export const domainErrorMapper = onError((error) => {
  // Already an ORPCError — don't re-map
  if (error instanceof ORPCError) return;

  for (const [ErrorClass, code] of DOMAIN_ERROR_MAP) {
    if (error instanceof ErrorClass) {
      throw new ORPCError(code, { message: error.message });
    }
  }

  // Unknown non-ORPCError will be handled by oRPC's default
  // (converted to INTERNAL_SERVER_ERROR)
});
```

**Step 2: Wire the error mapper into base procedures in `src/api/orpc/context.ts`**

Add the `domainErrorMapper` import and apply it to `publicProcedure` so it propagates to `authedProcedure` and `adminProcedure`:

At the top, add the import:
```typescript
import { domainErrorMapper } from "./domain-error-mapper.js";
```

Change the procedure definitions at the bottom of the file from:
```typescript
export const publicProcedure = os.$context<BaseContext>();
export const authedProcedure = publicProcedure.use(authMiddleware);
export const adminProcedure = authedProcedure.use(adminMiddleware);
```

To:
```typescript
export const publicProcedure = os.$context<BaseContext>().use(domainErrorMapper);
export const authedProcedure = publicProcedure.use(authMiddleware);
export const adminProcedure = authedProcedure.use(adminMiddleware);
```

**Step 3: Run existing tests to verify nothing breaks**

Run: `bun test`
Expected: All existing tests PASS — the middleware only catches errors that were previously unhandled or handled manually.

**Step 4: Commit**

```bash
git add src/api/orpc/domain-error-mapper.ts src/api/orpc/context.ts
git commit -m "feat: add global domain error mapping middleware for oRPC"
```

---

## Task 2: Write test proving the error mapper works

Add a test that calls an oRPC procedure which triggers a domain error (e.g., adding a wave score to a non-existent heat) and verifies it returns the correct HTTP status code via the middleware — not via try/catch in the handler.

**Files:**
- Create: `__tests__/api/orpc/domain-error-mapper.test.ts`

**Step 1: Write the test**

```typescript
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "bun:test";
import { clearTestData, setupTestDb, teardownTestDb } from "../../test-db.js";
import {
  TEST_HEAT_ID,
  TEST_RIDER_1_ID,
  rpcAsJudge,
  seedTestHeat,
  seedTestHierarchy,
  seedTestUsers,
} from "./helpers.js";

describe("Domain Error Mapper Middleware", () => {
  beforeAll(async () => {
    await setupTestDb();
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  beforeEach(async () => {
    await clearTestData();
    await seedTestUsers();
    await seedTestHierarchy();
    await seedTestHeat();
  });

  it("should map HeatDoesNotExistError to 404", async () => {
    const result = await rpcAsJudge("score.addWave", {
      heatId: "non-existent-heat",
      scoreUUID: "e0000000-0000-4000-a000-000000000e99",
      riderId: TEST_RIDER_1_ID,
      waveScore: 5.0,
    });
    expect(result.status).toBe(404);
  });

  it("should map RiderNotInHeatError to 400", async () => {
    const result = await rpcAsJudge("score.addWave", {
      heatId: TEST_HEAT_ID,
      scoreUUID: "e0000000-0000-4000-a000-000000000e99",
      riderId: "d0000000-0000-4000-a000-nonexistent1",
      waveScore: 5.0,
    });
    expect(result.status).toBe(400);
  });

  it("should map ScoreUUIDAlreadyExistsError to 400", async () => {
    const scoreUUID = "e0000000-0000-4000-a000-000000000e01";

    // Add first score
    await rpcAsJudge("score.addWave", {
      heatId: TEST_HEAT_ID,
      scoreUUID,
      riderId: TEST_RIDER_1_ID,
      waveScore: 5.0,
    });

    // Try to add duplicate
    const result = await rpcAsJudge("score.addWave", {
      heatId: TEST_HEAT_ID,
      scoreUUID,
      riderId: TEST_RIDER_1_ID,
      waveScore: 6.0,
    });
    expect(result.status).toBe(400);
  });

  it("should map ScoreMustBeInValidRangeError to 400", async () => {
    const result = await rpcAsJudge("score.addWave", {
      heatId: TEST_HEAT_ID,
      scoreUUID: "e0000000-0000-4000-a000-000000000e99",
      riderId: TEST_RIDER_1_ID,
      waveScore: 11.0,
    });
    expect(result.status).toBe(400);
  });
});
```

**Step 2: Run test to verify**

Run: `bun test __tests__/api/orpc/domain-error-mapper.test.ts`
Expected: All tests PASS — domain errors from `HeatService` are now mapped to correct HTTP status codes by the middleware without any try/catch in the route handler.

**Step 3: Commit**

```bash
git add __tests__/api/orpc/domain-error-mapper.test.ts
git commit -m "test: verify domain error mapper middleware maps errors to correct HTTP status codes"
```

---

## Task 3: Refactor `brackets.ts` — remove try/catch

The `generate` handler has a try/catch that manually maps 3 domain errors. Now that the middleware handles this, remove the try/catch.

**Files:**
- Modify: `src/api/orpc/routes/brackets.ts:142-170`

**Step 1: Refactor the `generate` handler**

Replace the current `generate` handler (lines 142-170) with:

```typescript
export const generate = adminProcedure
  .input(z.object({ divisionId: z.string().uuid(), format: z.literal("single_elimination") }))
  .output(z.object({ bracketId: z.string() }))
  .handler(async ({ input }) => {
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

This removes the try/catch entirely. The `DivisionNotFoundError` → 404, `BracketAlreadyExistsError` → 400, and `InsufficientParticipantsError` → 400 mappings are now handled by the middleware.

**Step 2: Run bracket tests**

Run: `bun test __tests__/api/orpc/brackets.test.ts`
Expected: All existing tests PASS — the middleware maps the same errors with the same status codes.

**Step 3: Run full test suite**

Run: `bun test`
Expected: All tests PASS

**Step 4: Commit**

```bash
git add src/api/orpc/routes/brackets.ts
git commit -m "refactor: remove try/catch from brackets.ts generate handler — middleware maps domain errors"
```

---

## Task 4: Refactor `scores.ts` — remove `ensureHeatNotCompleted` helper

The `HeatService` already validates that heats aren't completed. The `ensureHeatNotCompleted()` helper in `scores.ts` duplicates this check and directly throws `ORPCError`. With the middleware, the service's `HeatCompletedError` will be automatically mapped to 400.

**Files:**
- Modify: `src/api/orpc/routes/scores.ts`

**Step 1: Remove the `ensureHeatNotCompleted` function and its calls**

Delete the `ensureHeatNotCompleted` function (lines 24-34).

Remove all calls to `ensureHeatNotCompleted`:
- `updateWave` handler line 89
- `deleteWave` handler line 120
- `updateJump` handler line 189
- `deleteJump` handler line 225

The `HeatService.updateWaveScore()`, `HeatService.updateJumpScore()`, and `HeatService.deleteScore()` methods already check for completed heats and throw `HeatCompletedError`, which the middleware maps to 400.

**Step 2: Remove the unused `DbConnection` import**

After removing `ensureHeatNotCompleted`, the `getDb` import at line 5 may become unused in some handlers. Check if all remaining usages of `getDb` still exist. The `createHeatService` helper still uses it, so keep the import.

**Step 3: Run score tests**

Run: `bun test __tests__/api/orpc/scores.test.ts`
Expected: All tests PASS

**Step 4: Commit**

```bash
git add src/api/orpc/routes/scores.ts
git commit -m "refactor: remove ensureHeatNotCompleted helper from scores.ts — domain service validates"
```

---

## Task 5: Refactor `scores.ts` — remove inline `canEditScore` and type checks

The `canEditScore()` helper and the inline `existingScore.type !== "wave"` checks are currently in the route handler. The permission check (`canEditScore`) is an authorization concern that belongs in the route layer. The type check is already done by `HeatService.updateWaveScore()` / `deleteScore()` which throws `ScoreTypeMismatchError`.

The key question: `canEditScore` checks whether the user is the score's owner OR is head_judge/admin. This is an authorization check, and it's correct to keep it in the route layer. But the score existence check + type check are duplicated — the service does them too.

**Files:**
- Modify: `src/api/orpc/routes/scores.ts`

**Step 1: Simplify `updateWave` handler**

The service already validates score existence and type. Remove the redundant fetch-and-check pattern. Keep only the permission check since it needs `context.user`:

```typescript
export const updateWave = authedProcedure
  .input(
    z.object({
      heatId: z.string(),
      scoreUUID: z.string(),
      data: updateWaveScoreRequestSchema,
    })
  )
  .output(scoreActionResponseSchema)
  .handler(async ({ input, context }) => {
    const db = await getDb();
    const scoreRepository = createScoreRepository(db);
    const heatService = createHeatService(db);

    // Permission check: score must exist and belong to this user (or user is admin/head_judge)
    const existingScore = await scoreRepository.getScoreByUuid(input.scoreUUID);
    if (!existingScore) {
      throw new ORPCError("NOT_FOUND", { message: "Score not found" });
    }
    if (!canEditScore(context.user.role, existingScore.judgeId, context.user.id)) {
      throw new ORPCError("FORBIDDEN", { message: "You can only update your own scores" });
    }

    await heatService.updateWaveScore(input.scoreUUID, input.data.waveScore);

    await broadcastHeatUpdate(input.heatId);
    await broadcastHeadJudgeUpdate(input.heatId);

    return {
      heatId: input.heatId,
      scoreUUID: input.scoreUUID,
      message: "Wave score updated successfully",
    };
  });
```

**Step 2: Simplify `deleteWave` handler**

Remove the redundant type check `existingScore.type !== "wave"` — the service's `deleteScore` doesn't check type (it deletes any score). The type check in `deleteWave` prevents deleting a jump score via the wave endpoint, which is a useful constraint. Keep it as a route-level guard since it's about the API contract, not a business rule:

```typescript
export const deleteWave = authedProcedure
  .input(z.object({ heatId: z.string(), scoreUUID: z.string() }))
  .output(scoreActionResponseSchema)
  .handler(async ({ input, context }) => {
    const db = await getDb();
    const scoreRepository = createScoreRepository(db);
    const heatService = createHeatService(db);

    const existingScore = await scoreRepository.getScoreByUuid(input.scoreUUID);
    if (!existingScore) {
      throw new ORPCError("NOT_FOUND", { message: "Score not found" });
    }
    if (existingScore.type !== "wave") {
      throw new ORPCError("BAD_REQUEST", { message: "Score is not a wave score" });
    }
    if (!canEditScore(context.user.role, existingScore.judgeId, context.user.id)) {
      throw new ORPCError("FORBIDDEN", { message: "You can only delete your own scores" });
    }

    await heatService.deleteScore(input.scoreUUID);

    await broadcastHeatUpdate(input.heatId);
    await broadcastHeadJudgeUpdate(input.heatId);

    return {
      heatId: input.heatId,
      scoreUUID: input.scoreUUID,
      message: "Wave score deleted successfully",
    };
  });
```

**Step 3: Apply same pattern to `updateJump` and `deleteJump`**

Same changes: remove `ensureHeatNotCompleted` call (already done in Task 4), keep permission check, keep type guard for `deleteJump`.

**Step 4: Run score tests**

Run: `bun test __tests__/api/orpc/scores.test.ts`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add src/api/orpc/routes/scores.ts
git commit -m "refactor: simplify scores.ts handlers — remove redundant validation, keep permission checks"
```

---

## Task 6: Extract formatter functions in `heats.ts`

The `heats.ts` file has inline `.map()` transformations that should be extracted into dedicated formatter functions for consistency with other route files (seasons, contests, divisions, riders, brackets all use formatters).

**Files:**
- Modify: `src/api/orpc/routes/heats.ts`

**Step 1: Extract score formatting**

Add a `formatScore` function near the top of `heats.ts` (after the schema definitions):

```typescript
function formatScore(s: {
  scoreUuid: string;
  riderId: string;
  judgeId: string;
  type: string;
  scoreValue: number;
  jumpType: string | null;
  jumpModifiers: string[] | null;
  timestamp: Date;
}) {
  return {
    scoreUUID: s.scoreUuid,
    riderId: s.riderId,
    judgeId: s.judgeId,
    type: s.type as "wave" | "jump",
    scoreValue: s.scoreValue,
    jumpType: s.jumpType,
    modifiers: s.jumpModifiers,
    timestamp: s.timestamp,
  };
}
```

**Step 2: Extract domain score mapping**

Add a `toDomainScore` function:

```typescript
function toDomainScore(s: {
  scoreUuid: string;
  riderId: string;
  judgeId: string;
  type: string;
  scoreValue: number;
  jumpType: string | null;
  jumpModifiers: string[] | null;
  timestamp: Date;
}): Score {
  if (s.type === "wave") {
    return {
      type: "wave" as const,
      scoreUUID: s.scoreUuid,
      riderId: s.riderId,
      judgeId: s.judgeId,
      score: s.scoreValue,
      timestamp: s.timestamp,
    };
  }
  return {
    type: "jump" as const,
    scoreUUID: s.scoreUuid,
    riderId: s.riderId,
    judgeId: s.judgeId,
    score: s.scoreValue,
    jumpType: s.jumpType as JumpType,
    modifiers: s.jumpModifiers as JumpModifier[],
    timestamp: s.timestamp,
  };
}
```

**Step 3: Replace inline `.map()` calls in `listHeats`, `getHeat`, `getViewer`, and `getHeadJudge`**

In `listHeats` handler, replace:
```typescript
scores: scores.map((s) => ({
  scoreUUID: s.scoreUuid, ...
}))
```
with:
```typescript
scores: scores.map(formatScore)
```

In `getHeat` handler, replace:
```typescript
const domainScores: Score[] = dbScores.map((s) => { ... });
```
with:
```typescript
const domainScores: Score[] = dbScores.map(toDomainScore);
```

And replace the response scores mapping:
```typescript
scores: dbScores.map((s) => ({ scoreUUID: s.scoreUuid, ... isCounting: ... }))
```
This one includes `isCounting` which depends on computed state. Keep the inline map but use `formatScore` as a base:
```typescript
scores: dbScores.map((s) => ({
  ...formatScore(s),
  isCounting:
    s.judgeId === judgeId &&
    (s.type === "wave"
      ? countingWaveScores.has(s.scoreUuid)
      : countingJumpScores.has(s.scoreUuid)),
}))
```

Apply similar changes to `getViewer` and `getHeadJudge`.

**Step 4: Run heat tests**

Run: `bun test __tests__/api/orpc/heats.test.ts`
Expected: All tests PASS

**Step 5: Run full test suite**

Run: `bun test`
Expected: All tests PASS

**Step 6: Commit**

```bash
git add src/api/orpc/routes/heats.ts
git commit -m "refactor: extract formatScore and toDomainScore helpers in heats.ts"
```

---

## Task 7: Extract `formatParticipant` in `participants.ts`

The `participants.ts` file uses an inline `.map()` for rider formatting, while `riders.ts` has a dedicated `formatRider` function that does the same thing.

**Files:**
- Modify: `src/api/orpc/routes/participants.ts`

**Step 1: Extract formatter**

Add a `formatParticipant` function (identical to `formatRider` in `riders.ts`):

```typescript
function formatParticipant(rider: {
  id: string;
  firstName: string;
  lastName: string;
  country: string;
  sailNumber: string | null;
  email: string | null;
  dateOfBirth: Date | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: rider.id,
    firstName: rider.firstName,
    lastName: rider.lastName,
    country: rider.country,
    sailNumber: rider.sailNumber,
    email: rider.email,
    dateOfBirth: formatDate(rider.dateOfBirth),
    deletedAt: rider.deletedAt?.toISOString() ?? null,
    createdAt: rider.createdAt.toISOString(),
    updatedAt: rider.updatedAt.toISOString(),
  };
}
```

**Step 2: Replace inline map in `listParticipants`**

Change:
```typescript
riders: riders.map((rider) => ({ id: rider.id, ... }))
```
to:
```typescript
riders: riders.map(formatParticipant)
```

**Step 3: Run participant tests**

Run: `bun test __tests__/api/orpc/participants.test.ts`
Expected: All tests PASS

**Step 4: Commit**

```bash
git add src/api/orpc/routes/participants.ts
git commit -m "refactor: extract formatParticipant in participants.ts for consistency"
```

---

## Task 8: Delete legacy `src/api/middleware/error-handling.ts`

With the new `domain-error-mapper.ts` in place, the old `error-handling.ts` middleware is dead code. Its functions (`isDomainError`, `getDomainErrorStatusCode`, `withErrorHandling`) were used by the old HTTP routes.

**Files:**
- Delete: `src/api/middleware/error-handling.ts`

**Step 1: Verify no imports exist**

Search for any imports of `error-handling` in `.ts` and `.tsx` files (excluding test files and the file itself).

Run: search for `error-handling` imports across the codebase.

If old HTTP route files still import it (e.g., `src/api/routes/heat-routes.ts`), do NOT delete yet — those old routes may still be used by some tests. In that case, skip this task.

**Step 2: If safe to delete, remove the file**

```bash
git rm src/api/middleware/error-handling.ts
```

**Step 3: Run full test suite**

Run: `bun test`
Expected: All tests PASS

**Step 4: Commit**

```bash
git commit -m "chore: delete legacy error-handling middleware — replaced by domain-error-mapper"
```

---

## Task 9: Final verification and quality checks

**Step 1: Run full test suite**

Run: `bun run test:all`
Expected: All tests PASS (backend + frontend)

**Step 2: Run quality checks**

Run: `bun format && bun check:fix && bun typecheck`
Expected: No errors

**Step 3: Commit any format/lint fixes**

```bash
git add -A
git commit -m "chore: format and lint fixes after API conventions refactor"
```

**Step 4: Verify success criteria**

Manually check:
- [ ] Every route handler follows Shape A (simple) or Shape B (transactional)
- [ ] Zero try/catch blocks for domain errors in route handlers
- [ ] `DOMAIN_ERROR_MAP` in `domain-error-mapper.ts` is the single source of truth
- [ ] All route files use dedicated formatter functions (no inline `.map()` transformations)
- [ ] `ensureHeatNotCompleted()` helper is deleted from `scores.ts`
- [ ] `brackets.ts` `generate` handler has no try/catch

---

## Summary of changes

| File | Change |
|------|--------|
| `src/api/orpc/domain-error-mapper.ts` | NEW — centralized error mapping |
| `src/api/orpc/context.ts` | Add `domainErrorMapper` to `publicProcedure` |
| `src/api/orpc/routes/brackets.ts` | Remove try/catch from `generate` |
| `src/api/orpc/routes/scores.ts` | Remove `ensureHeatNotCompleted`, simplify handlers |
| `src/api/orpc/routes/heats.ts` | Extract `formatScore`, `toDomainScore` |
| `src/api/orpc/routes/participants.ts` | Extract `formatParticipant` |
| `src/api/middleware/error-handling.ts` | DELETE (if safe) |
| `__tests__/api/orpc/domain-error-mapper.test.ts` | NEW — middleware tests |
