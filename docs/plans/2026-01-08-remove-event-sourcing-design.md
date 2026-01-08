# Design: Remove Event Sourcing and Adopt Pure Relational Architecture

**Date**: 2026-01-08
**Status**: Proposed
**Author**: Architecture Review

## Problem Statement

The application currently uses a dual-persistence architecture:
- **Relational DB (Drizzle/PostgreSQL)**: Heat records, bracket structure, referential integrity
- **Event Store (Emmet)**: Heat lifecycle events, scoring events, state reconstruction

This creates consistency issues:

### Issue A: Split-Brain Risk
Heat can exist in one system but not the other. Examples:
- `src/api/routes.ts:173-191` - DB write failures are swallowed after event store succeeds
- `src/domain/bracket/bracket-service.ts:145-177` - Event store operations happen after DB transaction commits

### Issue C: Transaction Rollback Scenarios
Distributed transactions across two systems require compensating actions:
- Bracket generation: DB transaction commits → event store fails → cleanup may fail
- No mechanism to rollback event store if DB operations fail later

## Proposed Solution

**Remove event sourcing entirely** and adopt a pure relational architecture with PostgreSQL as the single source of truth.

## Design Rationale

### Why Remove Event Sourcing?

1. **Heat lifecycle doesn't require event sourcing** - The primary use case is scoring and bracket progression, not time-travel or complex state reconstruction
2. **Audit trail can be added later** - PostgreSQL CDC (Change Data Capture) or write-ahead log (WAL) can provide audit capabilities when needed
3. **Eliminates consistency issues** - Single source of truth with ACID transactions
4. **Simpler architecture** - Removes projection complexity, dual-write coordination, and compensating actions
5. **WebSocket notifications sufficient** - Real-time updates don't require event sourcing

### What We Keep

- Domain logic and validation
- Transaction safety
- WebSocket broadcasts for real-time updates
- Ability to add audit trail later via CDC

### What We Remove

- Event store (Emmet framework)
- Event sourcing for heat lifecycle
- State reconstruction from events
- Decider pattern and event handlers

## Architecture Overview

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │ HTTP/WebSocket
       ▼
┌─────────────────────────────────────────┐
│           API Layer                     │
│  - Route handlers                       │
│  - Request validation                   │
│  - WebSocket broadcast                  │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│        Domain Layer                     │
│  - HeatService                          │
│  - BracketService                       │
│  - Score calculation                    │
│  - Business rules                       │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│    Infrastructure Layer                 │
│  - Repositories (Drizzle)               │
│  - PostgreSQL transactions              │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│         PostgreSQL                      │
│  - heats table                          │
│  - scores table (new)                   │
│  - brackets, riders, users              │
└─────────────────────────────────────────┘
```

## Database Schema Changes

### New `scores` Table

```typescript
export const scores = pgTable(
  "scores",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    scoreUuid: text("score_uuid").notNull().unique(),
    heatId: text("heat_id")
      .notNull()
      .references(() => heats.heatId, { onDelete: "cascade" }),
    riderId: uuid("rider_id")
      .notNull()
      .references(() => riders.id, { onDelete: "cascade" }),
    judgeId: uuid("judge_id")
      .notNull()
      .references(() => users.id),
    scoreType: text("score_type").notNull(), // 'wave' | 'jump'
    scoreValue: numeric("score_value", { precision: 4, scale: 2 }).notNull(),
    jumpType: text("jump_type"), // nullable, for jumps only
    jumpModifiers: text("jump_modifiers"), // JSON array, for jumps only
    timestamp: timestamp("timestamp").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    heatIdIdx: index("score_heat_id_idx").on(table.heatId),
    riderIdIdx: index("score_rider_id_idx").on(table.riderId),
    scoreUuidIdx: index("score_uuid_idx").on(table.scoreUuid),
  })
);
```

### Update `heats` Table

Add `completedAt` column:

```typescript
export const heats = pgTable(
  "heats",
  {
    // ... existing fields
    completedAt: timestamp("completed_at"), // Add this field
  }
);
```

## Component Changes

### Files to Delete

```
src/infrastructure/eventStore.ts
src/domain/heat/decider.ts
src/domain/heat/viewer-state.ts
src/api/helpers.ts (functions: aggregateHeatState, handleCommand)
__tests__/domain/heat/integration.test.ts
```

### Dependencies to Remove

```json
"@event-driven-io/emmett": "^0.41.0",
"@event-driven-io/emmett-postgresql": "^0.41.0",
```

### New Domain Service: `HeatService`

Replaces event sourcing decider with service class:

```typescript
// src/domain/heat/heat-service.ts

export class HeatService {
  constructor(
    private heatRepository: HeatRepository,
    private scoreRepository: ScoreRepository
  ) {}

  async addWaveScore(
    heatId: string,
    scoreUuid: string,
    riderId: string,
    judgeId: string,
    scoreValue: number,
    timestamp: Date,
    tx?: DbTransaction
  ): Promise<void> {
    const db = tx ?? await getDb();

    // Validate heat
    const heat = await this.heatRepository.getHeatByHeatId(heatId, db);
    if (!heat) throw new HeatDoesNotExistError(heatId);
    if (heat.completedAt) throw new Error("Heat already completed");

    // Validate rider in heat
    if (!heat.riderIds.includes(riderId)) {
      throw new RiderNotInHeatError(riderId, heatId);
    }

    // Validate score range
    if (scoreValue < 0 || scoreValue > 10) {
      throw new ScoreMustBeInValidRangeError(scoreValue);
    }

    // Insert score
    await this.scoreRepository.insertScore({
      scoreUuid,
      heatId,
      riderId,
      judgeId,
      scoreType: 'wave',
      scoreValue,
      timestamp,
    }, db);
  }

  async addJumpScore(
    heatId: string,
    scoreUuid: string,
    riderId: string,
    judgeId: string,
    scoreValue: number,
    jumpType: string,
    jumpModifiers: string[],
    timestamp: Date,
    tx?: DbTransaction
  ): Promise<void> {
    // Similar to addWaveScore, but with jump-specific fields
  }

  async completeHeat(
    heatId: string,
    completedAt: Date,
    tx?: DbTransaction
  ): Promise<void> {
    const executeInTransaction = async (txn: DbTransaction) => {
      // 1. Mark heat completed
      await this.heatRepository.markCompleted(heatId, completedAt, txn);

      // 2. Calculate winner/loser from scores
      const scores = await this.scoreRepository.getScoresByHeatId(heatId, txn);
      const heat = await this.heatRepository.getHeatByHeatId(heatId, txn);

      const totals = calculateRiderScoreTotals(
        scores,
        heat.wavesCounting,
        heat.jumpsCounting
      );

      if (totals.length === 0) return; // No riders

      const winner = totals[0];
      const loser = totals.length > 1 ? totals[1] : null;

      // 3. Get metadata and advance riders
      const metadata = await this.heatRepository.getHeatMetadata(heatId, txn);

      if (metadata?.winnerDestinationHeatId) {
        await this.advanceRider(
          metadata.winnerDestinationHeatId,
          winner.riderId,
          txn
        );
      }

      if (loser && metadata?.loserDestinationHeatId) {
        await this.advanceRider(
          metadata.loserDestinationHeatId,
          loser.riderId,
          txn
        );
      }
    };

    if (tx) {
      await executeInTransaction(tx);
    } else {
      const db = await getDb();
      await db.transaction(executeInTransaction);
    }
  }

  private async advanceRider(
    destHeatId: string,
    riderId: string,
    tx: DbTransaction
  ): Promise<void> {
    await this.heatRepository.addRiderToHeat(destHeatId, riderId, tx);

    // Check if it's a bye heat (1 rider) and auto-complete
    const riderIds = await this.heatRepository.getHeatRiderIds(destHeatId, tx);
    if (riderIds.length === 1) {
      await this.completeHeat(destHeatId, new Date(), tx);
    }
  }
}
```

### New Repository: `ScoreRepository`

```typescript
// src/domain/heat/repositories.ts

export interface ScoreRepository {
  insertScore(score: InsertScoreInput, tx?: DbTransaction): Promise<void>;
  getScoresByHeatId(heatId: string, tx?: DbTransaction): Promise<Score[]>;
  getScoreByUuid(scoreUuid: string, tx?: DbTransaction): Promise<Score | null>;
  updateScore(scoreUuid: string, updates: UpdateScoreInput, tx?: DbTransaction): Promise<void>;
}

export interface InsertScoreInput {
  scoreUuid: string;
  heatId: string;
  riderId: string;
  judgeId: string;
  scoreType: 'wave' | 'jump';
  scoreValue: number;
  jumpType?: string;
  jumpModifiers?: string[];
  timestamp: Date;
}

export interface UpdateScoreInput {
  scoreValue?: number;
  jumpType?: string;
  jumpModifiers?: string[];
}

export interface Score {
  id: string;
  scoreUuid: string;
  heatId: string;
  riderId: string;
  judgeId: string;
  scoreType: 'wave' | 'jump';
  scoreValue: number;
  jumpType: string | null;
  jumpModifiers: string[] | null;
  timestamp: Date;
  createdAt: Date;
}
```

### Updated Bracket Generation

```typescript
// src/domain/bracket/bracket-service.ts

export async function generateBracketForDivision(
  divisionId: string,
  repositories: {
    divisionRepository: DivisionRepository;
    bracketRepository: BracketRepository;
    divisionParticipantRepository: DivisionParticipantRepository;
    heatRepository: HeatRepository;
  }
): Promise<string> {
  // Validation
  const division = await divisionRepository.getDivisionById(divisionId);
  if (!division) throw new DivisionNotFoundError(divisionId);

  const existingBracket = await bracketRepository.getBracketByDivisionId(divisionId);
  if (existingBracket) throw new BracketAlreadyExistsError(divisionId);

  const riderIds = await divisionParticipantRepository.getRiderIdsByDivisionId(divisionId);
  if (riderIds.length < 2) throw new InsufficientParticipantsError(riderIds.length);
  if (riderIds.length > 64) throw new Error("Maximum 64 participants");

  const bracketStructure = generateSingleEliminationBracket(riderIds);

  // Single transaction for entire bracket creation
  const db = await getDb();
  return await db.transaction(async (tx) => {
    // Create bracket
    const bracket = await bracketRepository.createBracket({
      divisionId,
      name: "Single Elimination",
      format: "single_elimination",
      status: "in_progress",
    }, tx);

    // Create all heats (reverse order for FK constraints)
    for (const round of bracketStructure.rounds.slice().reverse()) {
      for (const heatSpec of round.heats) {
        const heatId = `bracket-${bracket.id}-${heatSpec.position}`;

        let winnerDestinationHeatId = null;
        let loserDestinationHeatId = null;

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
        }, tx);

        // Auto-complete bye heats
        if (heatSpec.riderIds.length === 1) {
          await heatRepository.markCompleted(heatId, new Date(), tx);
        }
      }
    }

    return bracket.id;
    // If ANY operation fails, entire bracket creation rolls back atomically
  });
}
```

### Updated API Routes

```typescript
// src/api/routes/heat-routes.ts

export async function handleAddWaveScore(
  request: Request & { user: { id: string } }
): Promise<Response> {
  try {
    const body = await request.json();
    const validationResult = addWaveScoreRequestSchema.safeParse(body);

    if (!validationResult.success) {
      const errors = validationResult.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join(", ");
      return createErrorResponse(`Validation error: ${errors}`, 400);
    }

    const heatService = new HeatService(
      createHeatRepository(),
      createScoreRepository()
    );

    await heatService.addWaveScore(
      validationResult.data.heatId,
      validationResult.data.scoreUUID,
      validationResult.data.riderId,
      request.user.id, // judgeId from auth
      validationResult.data.waveScore,
      new Date()
    );

    // Broadcast to WebSocket clients for real-time updates
    await broadcastEvent(validationResult.data.heatId, {
      type: "WaveScoreAdded",
      data: {
        heatId: validationResult.data.heatId,
        scoreUUID: validationResult.data.scoreUUID,
        riderId: validationResult.data.riderId,
        judgeId: request.user.id,
        waveScore: validationResult.data.waveScore,
        timestamp: new Date(),
      },
    });

    return createSuccessResponse({ success: true });
  } catch (error) {
    if (error instanceof HeatDoesNotExistError) {
      return createErrorResponse(error.message, 404);
    }
    if (error instanceof RiderNotInHeatError) {
      return createErrorResponse(error.message, 400);
    }
    if (error instanceof ScoreMustBeInValidRangeError) {
      return createErrorResponse(error.message, 400);
    }
    console.error("Error adding wave score:", error);
    return createErrorResponse("Internal server error", 500);
  }
}

export async function handleCompleteHeat(
  request: Request & { user: { id: string, role: string } }
): Promise<Response> {
  try {
    const heatId = new URL(request.url).pathname.split('/')[3];

    const heatService = new HeatService(
      createHeatRepository(),
      createScoreRepository()
    );

    await heatService.completeHeat(heatId, new Date());

    // Broadcast to WebSocket clients
    await broadcastEvent(heatId, {
      type: "HeatCompleted",
      data: { heatId, completedAt: new Date() },
    });

    return createSuccessResponse({ success: true });
  } catch (error) {
    console.error("Error completing heat:", error);
    return createErrorResponse("Internal server error", 500);
  }
}
```

## Migration Strategy

### Phase 1: Add New Infrastructure
1. Create `scores` table schema
2. Add `completedAt` column to `heats` table
3. Run database migration
4. Create `ScoreRepository` interface and implementation
5. Create `HeatService` class

### Phase 2: Update Bracket Generation
1. Modify `generateBracketForDivision()` to use single transaction
2. Remove event store operations
3. Update tests to verify transactional behavior

### Phase 3: Update API Routes
1. Replace event store commands with service calls
2. Update route handlers to use `HeatService`
3. Keep WebSocket broadcasts for real-time updates
4. Update API tests

### Phase 4: Remove Event Store
1. Remove event store initialization
2. Delete event sourcing files
3. Remove Emmet dependencies
4. Update documentation

### Phase 5: Update Tests
1. Rewrite integration tests without event store
2. Add transaction rollback tests
3. Verify bracket generation atomicity

## Benefits

### Consistency Guarantees
- ✅ **No split-brain** - Single source of truth in PostgreSQL
- ✅ **ACID transactions** - All operations atomic, consistent, isolated, durable
- ✅ **Automatic rollback** - Database handles failures, no compensating actions needed
- ✅ **Referential integrity** - Foreign keys enforce data consistency

### Simplicity
- ✅ **Fewer components** - No event store, no projections, no dual-write coordination
- ✅ **Standard patterns** - Familiar repository and service patterns
- ✅ **Easier debugging** - Single database to inspect
- ✅ **Simpler tests** - No event sourcing mocks needed

### Performance
- ✅ **Single write path** - No dual writes to coordinate
- ✅ **Efficient queries** - Direct database queries with joins
- ✅ **Reduced latency** - No event store append overhead

### Future-Proofing
- ✅ **CDC-ready** - Can add PostgreSQL CDC for audit trail later
- ✅ **Flexible** - Can add event sourcing back if needed for specific aggregates
- ✅ **Standard tooling** - PostgreSQL monitoring, backup, replication

## Trade-offs

### What We Lose
- ❌ **Event sourcing benefits** - No time-travel debugging, no state reconstruction from events
- ❌ **Complete audit trail** - Need to add CDC or trigger-based auditing later if required
- ❌ **Event-driven architecture** - No event bus for cross-aggregate communication (can add later if needed)

### What We Keep
- ✅ **Domain logic** - Business rules, validation, score calculation remain intact
- ✅ **Real-time updates** - WebSocket broadcasts still work
- ✅ **Transaction safety** - ACID guarantees from PostgreSQL
- ✅ **Testability** - Can test with in-memory database or test transactions

## Testing Strategy

### Unit Tests
- Test `HeatService` methods with mocked repositories
- Test score calculation logic
- Test validation rules

### Integration Tests
- Test bracket generation creates all heats atomically
- Test transaction rollback on failures
- Test heat completion and rider advancement
- Test concurrent score additions

### End-to-End Tests
- Test complete bracket workflow from creation to finals
- Test WebSocket broadcasts
- Test API error handling

## Future Enhancements

### Audit Trail (Future Work)
If audit requirements emerge, consider:
- **PostgreSQL CDC** - Use logical replication to capture all changes
- **Trigger-based auditing** - Add triggers to capture changes to audit table
- **Event sourcing for specific aggregates** - Add back event sourcing only where needed

### Performance Optimizations
- Add read replicas for query scaling
- Add caching layer for hot data (bracket structure, rider info)
- Add database connection pooling optimization

## Success Criteria

1. ✅ All bracket operations are atomic (single transaction)
2. ✅ No consistency issues between systems
3. ✅ WebSocket real-time updates continue to work
4. ✅ All existing tests pass with new implementation
5. ✅ Code is simpler and easier to understand
6. ✅ Performance is equal or better than current implementation

## Conclusion

Removing event sourcing and adopting a pure relational architecture eliminates consistency issues, simplifies the codebase, and provides strong ACID guarantees. The trade-off of losing event sourcing benefits is acceptable given:
1. Heat lifecycle doesn't require state reconstruction
2. Audit trail can be added later via CDC if needed
3. Transaction safety is more critical than event-driven patterns

This design provides a solid foundation that can evolve as requirements change.
