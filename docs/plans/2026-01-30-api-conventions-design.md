# API Conventions for AI Agent Velocity

**Goal:** Standardize API route handler and error handling patterns so that every similar thing is done the same way. Agents pattern-match heavily — inconsistency forces them to check each instance individually.

**Scope:** API route handler structure (#1) and error handling boundaries (#2). Other convention areas (repositories, frontend, tests) are deferred to future design documents.

**Tech Stack:** oRPC, Zod, Drizzle ORM, TypeScript strict mode

---

## Convention 1: Canonical Route Handler Pattern

### Problem

Route handlers currently have 3+ different approaches:
- `scores.ts` validates in helper functions (`ensureHeatNotCompleted()`, `canEditScore()`) before calling the service
- `brackets.ts` catches domain errors in a 20-line try/catch and maps them to ORPCError
- `riders.ts` calls the repository directly with no validation
- `heats.ts` uses inline `.map()` transformations for response formatting
- `contests.ts` uses a dedicated `formatContest()` function

An agent writing a new route has no single pattern to follow.

### Solution: Two handler shapes

Every route handler uses exactly one of two shapes.

**Shape A: Simple (reads, single-step writes)**

```typescript
export const getSeason = authedProcedure
  .input(z.object({ seasonId: z.string().uuid() }))
  .output(seasonSchema)
  .handler(async ({ input, context }) => {
    // 1. Create repositories
    const seasonRepo = createSeasonRepository();

    // 2. Call repository or service
    const season = await seasonRepo.getSeasonById(input.seasonId);

    // 3. Existence check (the ONE thing routes validate)
    if (!season) {
      throw new ORPCError("NOT_FOUND", { message: "Season not found" });
    }

    // 4. Format response with a dedicated formatter
    return formatSeason(season);
  });
```

**Shape B: Transactional (multi-step writes)**

```typescript
export const completeHeat = adminProcedure
  .input(z.object({ heatId: z.string().uuid() }))
  .output(heatSchema)
  .handler(async ({ input, context }) => {
    const db = await getDb();

    // Transaction boundary lives HERE in the handler
    const result = await db.transaction(async (tx) => {
      const heatRepo = createHeatRepository();
      const scoreRepo = createScoreRepository();

      const heat = await heatRepo.getHeatByHeatId(input.heatId, tx);
      if (!heat) {
        throw new ORPCError("NOT_FOUND", { message: "Heat not found" });
      }

      // Domain logic via service — service receives tx, never creates its own
      const heatService = new HeatService(heatRepo, scoreRepo);
      await heatService.completeHeat(input.heatId, new Date(), tx);

      return await heatRepo.getHeatByHeatId(input.heatId, tx);
    });

    // Side effects AFTER transaction commits
    broadcastHeatUpdate(input.heatId);

    return formatHeat(result!);
  });
```

### Rules

1. **Two shapes only** — Shape A (simple) or Shape B (transactional). No third option.
2. **Transaction boundary is in the handler** — repos and services receive `tx` as a parameter, never call `db.transaction()` themselves.
3. **Repos and services are transaction-unaware** — they accept an optional `tx` but never create transactions.
4. **Side effects (websockets, notifications) happen AFTER the transaction block** — never inside `db.transaction()`.
5. **Existence checks (`if (!entity) throw NOT_FOUND`) stay in the handler** — they're infrastructure concerns, not domain logic.
6. **All other validation lives in domain services** — the handler never checks business rules directly.
7. **Response formatting uses dedicated functions** — no inline `.map()` transformations in handlers. Formatters are defined at the top of the route file.
8. **No try/catch for domain errors in handlers** — error mapping is handled by middleware (Convention 2).

### What changes

| File | Current | Target |
|------|---------|--------|
| `scores.ts` | `ensureHeatNotCompleted()` and `canEditScore()` helpers | Remove helpers; validation moves to `HeatService` |
| `brackets.ts` | 20-line try/catch mapping domain errors | Remove try/catch; middleware maps errors |
| `heats.ts` | Inline `.map()` transformations | Extract `formatHeat()`, `formatHeatViewer()` functions |
| `heats.ts` | `HeatService.completeHeat()` calls `db.transaction()` internally | Handler owns transaction, service accepts `tx` |

---

## Convention 2: Error Handling Boundaries

### Problem

Three conflicting approaches exist:
- `scores.ts` validates in helper functions before calling the service
- `brackets.ts` catches domain errors in try/catch and maps to ORPCError
- Most routes throw ORPCError directly for not-found checks
- `HeatService` throws custom domain errors but nothing catches them consistently

An agent doesn't know where to put validation or how errors should propagate.

### Solution: Three-layer error model with zero overlap

```
Client Request
     │
     ▼
┌──────────────────────────────────────┐
│ Layer 1: oRPC Input Validation       │
│ .input(z.object({...}))              │
│ → 400 with Zod error details         │
│ Validates: shape, types, formats,    │
│   static ranges (score 0-10)         │
│ Agent rule: NEVER replicate this     │
│   in the handler or service          │
└──────────┬───────────────────────────┘
           │ (valid input)
           ▼
┌──────────────────────────────────────┐
│ Layer 2: Route Handler               │
│ Validates: entity existence only     │
│ → NOT_FOUND for null lookups         │
│ Agent rule: Only throw NOT_FOUND     │
│   for null entity lookups. Never     │
│   check business rules here.         │
└──────────┬───────────────────────────┘
           │ (domain error thrown)
           ▼
┌──────────────────────────────────────┐
│ Layer 3: Error Mapping Middleware     │
│ Maps domain errors → ORPCError       │
│ Unknown errors → 500                 │
│ Agent rule: One line per new domain  │
│   error in ERROR_MAP                 │
└──────────────────────────────────────┘
```

### The error mapping middleware

New file: `src/api/orpc/error-mapper.ts`

```typescript
import { ORPCError } from "@orpc/client";
import {
  HeatCompletedError,
  HeatDoesNotExistError,
  RiderNotInHeatError,
  ScoreMustBeInValidRangeError,
  ScoreNotFoundError,
  ScoreTypeMismatchError,
  ScoreUUIDAlreadyExistsError,
} from "../../domain/heat/errors";
import {
  BracketAlreadyExistsError,
  DivisionNotFoundError,
  InsufficientParticipantsError,
} from "../../domain/bracket/errors";

// Each entry: [DomainErrorClass, ORPCErrorCode]
const ERROR_MAP: Array<[new (...args: any[]) => Error, string]> = [
  // 400 BAD_REQUEST — client violated a business rule
  [HeatCompletedError, "BAD_REQUEST"],
  [ScoreMustBeInValidRangeError, "BAD_REQUEST"],
  [ScoreUUIDAlreadyExistsError, "BAD_REQUEST"],
  [ScoreTypeMismatchError, "BAD_REQUEST"],
  [BracketAlreadyExistsError, "BAD_REQUEST"],
  [InsufficientParticipantsError, "BAD_REQUEST"],
  [RiderNotInHeatError, "BAD_REQUEST"],

  // 404 NOT_FOUND — referenced entity doesn't exist
  [HeatDoesNotExistError, "NOT_FOUND"],
  [ScoreNotFoundError, "NOT_FOUND"],
  [DivisionNotFoundError, "NOT_FOUND"],
];

export function mapDomainError(error: unknown): never {
  if (error instanceof ORPCError) throw error; // already mapped

  for (const [ErrorClass, code] of ERROR_MAP) {
    if (error instanceof ErrorClass) {
      throw new ORPCError(code, { message: (error as Error).message });
    }
  }

  // Unknown error — log and rethrow as internal
  console.error("Unhandled domain error:", error);
  throw new ORPCError("INTERNAL_SERVER_ERROR", {
    message: "An unexpected error occurred",
  });
}
```

This middleware is applied once in the oRPC router setup, wrapping all procedures.

### Responsibility boundaries

| Layer | Validates | Examples |
|-------|-----------|---------|
| **Zod schemas** | Input shape, types, static constraints | `seasonId` is a UUID, `score` is 0-10, `name` is non-empty |
| **Route handler** | Entity existence | Season with this ID exists in DB |
| **Domain service** | Business rules requiring DB state | Heat is not completed, rider is in heat, score UUID is unique |

### Rules for agents

1. **Adding a new domain error?** → Create the error class in `domain/{entity}/errors.ts`, add one line to `ERROR_MAP`.
2. **Writing a new route handler?** → Never catch domain errors. Just call the service. The middleware handles mapping.
3. **Need input validation?** → If it's a static constraint (format, range, required field), put it in the Zod schema. If it requires DB state, put it in the domain service.
4. **Only four HTTP error codes are used:** `BAD_REQUEST` (400), `UNAUTHORIZED` (401), `FORBIDDEN` (403), `NOT_FOUND` (404). Pick one.

### What changes

| File | Current | Target |
|------|---------|--------|
| `brackets.ts` | 20-line try/catch mapping 3 domain errors | Remove try/catch entirely |
| `scores.ts` | `ensureHeatNotCompleted()` helper | Move to `HeatService`; middleware maps `HeatCompletedError` |
| `scores.ts` | `canEditScore()` helper | Move permission check to service or keep as auth concern |
| `heats.ts` | Mixed inline error handling | Clean handler + middleware |
| Router setup | No error middleware | Add `mapDomainError` as global oRPC middleware |

---

## Implementation approach

This design integrates with the ongoing oRPC migration (see `2026-01-29_orpc-migration-plan.md`). The transaction boundary change (handlers own transactions, services receive `tx`) is being implemented in a parallel session.

### Recommended implementation order

1. Create `src/api/orpc/error-mapper.ts` and wire into router
2. Refactor `brackets.ts` to remove try/catch (simplest case, validates the middleware works)
3. Move `scores.ts` helper functions into `HeatService`
4. Refactor `scores.ts` handlers to use the canonical pattern
5. Extract formatter functions in `heats.ts`
6. Refactor remaining routes to match the canonical pattern
7. Run full test suite to verify nothing broke

### Success criteria

- Every route handler follows Shape A or Shape B — no exceptions
- Zero try/catch blocks for domain errors in route handlers
- `ERROR_MAP` is the single source of truth for domain-to-HTTP error mapping
- An agent can write a new route by copying any existing route — they all look the same
