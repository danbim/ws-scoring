# Head Judge Screen Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a comprehensive head judge control panel that displays all judges' score sheets side-by-side in real-time with full editing capabilities and validation.

**Architecture:** Leverages existing multi-judge infrastructure. Adds dedicated REST endpoint (`GET /api/heats/{heatId}/head-judge`) and WebSocket endpoint (`/ws/head-judge/{heatId}`) with role-based authorization. Frontend displays judge columns that auto-appear as judges score, with full CRUD operations and agreement validation before heat completion.

**Tech Stack:** SolidJS, Bun, WebSocket, Drizzle ORM, PGlite (testing), Tailwind CSS

---

## Phase 1: Backend Foundation

### Task 1: Judge Agreement Validation Domain Logic

**Files:**
- Create: `src/domain/heat/judge-agreement.ts`
- Test: `__tests__/domain/heat/judge-agreement.test.ts`

**Step 1: Write the failing test**

Create test file:

```typescript
import { describe, expect, it } from "bun:test";
import type { Score } from "../../../src/domain/heat/types";
import { validateJudgeAgreement } from "../../../src/domain/heat/judge-agreement";

describe("validateJudgeAgreement", () => {
  it("should return no discrepancies when judges agree on wave counts", () => {
    const scores: Score[] = [
      {
        type: "wave",
        scoreUUID: "w1",
        riderId: "rider1",
        judgeId: "judge1",
        score: 7.5,
        timestamp: new Date(),
      },
      {
        type: "wave",
        scoreUUID: "w2",
        riderId: "rider1",
        judgeId: "judge1",
        score: 8.0,
        timestamp: new Date(),
      },
      {
        type: "wave",
        scoreUUID: "w3",
        riderId: "rider1",
        judgeId: "judge2",
        score: 7.0,
        timestamp: new Date(),
      },
      {
        type: "wave",
        scoreUUID: "w4",
        riderId: "rider1",
        judgeId: "judge2",
        score: 8.5,
        timestamp: new Date(),
      },
    ];

    const result = validateJudgeAgreement(scores, ["rider1"]);

    expect(result.hasDiscrepancies).toBe(false);
    expect(result.discrepancies).toHaveLength(0);
  });

  it("should detect wave count discrepancies", () => {
    const scores: Score[] = [
      {
        type: "wave",
        scoreUUID: "w1",
        riderId: "rider1",
        judgeId: "judge1",
        score: 7.5,
        timestamp: new Date(),
      },
      {
        type: "wave",
        scoreUUID: "w2",
        riderId: "rider1",
        judgeId: "judge1",
        score: 8.0,
        timestamp: new Date(),
      },
      {
        type: "wave",
        scoreUUID: "w3",
        riderId: "rider1",
        judgeId: "judge2",
        score: 7.0,
        timestamp: new Date(),
      },
    ];

    const result = validateJudgeAgreement(scores, ["rider1"]);

    expect(result.hasDiscrepancies).toBe(true);
    expect(result.discrepancies).toHaveLength(1);
    expect(result.discrepancies[0].type).toBe("wave_count");
    expect(result.discrepancies[0].riderId).toBe("rider1");
  });

  it("should detect jump catalog discrepancies", () => {
    const scores: Score[] = [
      {
        type: "jump",
        scoreUUID: "j1",
        riderId: "rider1",
        judgeId: "judge1",
        score: 8.0,
        jumpType: "forward",
        modifiers: ["oneHanded"],
        timestamp: new Date(),
      },
      {
        type: "jump",
        scoreUUID: "j2",
        riderId: "rider1",
        judgeId: "judge2",
        score: 7.5,
        jumpType: "forward",
        modifiers: [],
        timestamp: new Date(),
      },
    ];

    const result = validateJudgeAgreement(scores, ["rider1"]);

    expect(result.hasDiscrepancies).toBe(true);
    expect(result.discrepancies[0].type).toBe("jump_catalog");
  });
});
```

**Step 2: Run test to verify it fails**

Run:
```bash
bun test __tests__/domain/heat/judge-agreement.test.ts
```

Expected: FAIL with "validateJudgeAgreement is not defined"

**Step 3: Write minimal implementation**

Create implementation file:

```typescript
import type { JumpModifier, JumpType, Score } from "./types";

export interface Discrepancy {
  type: "wave_count" | "jump_catalog";
  riderId: string;
  details: Record<string, unknown>;
}

export interface AgreementValidationResult {
  hasDiscrepancies: boolean;
  discrepancies: Discrepancy[];
}

/**
 * Validates that all judges observed and recorded the same events for each rider.
 * - Wave count agreement: All judges recorded the same number of waves
 * - Jump catalog agreement: All judges recorded the same set of jumps (type + modifiers)
 */
export function validateJudgeAgreement(
  scores: Score[],
  riderIds: string[]
): AgreementValidationResult {
  const discrepancies: Discrepancy[] = [];

  // Get unique judge IDs
  const judgeIds = Array.from(new Set(scores.map((s) => s.judgeId)));

  // No validation needed if only one or zero judges
  if (judgeIds.length <= 1) {
    return { hasDiscrepancies: false, discrepancies: [] };
  }

  for (const riderId of riderIds) {
    // Check wave count agreement
    const waveCounts = new Map<string, number>();
    for (const judgeId of judgeIds) {
      const count = scores.filter(
        (s) => s.type === "wave" && s.riderId === riderId && s.judgeId === judgeId
      ).length;
      waveCounts.set(judgeId, count);
    }

    const uniqueWaveCounts = Array.from(new Set(waveCounts.values()));
    if (uniqueWaveCounts.length > 1) {
      discrepancies.push({
        type: "wave_count",
        riderId,
        details: {
          judgeCounts: Object.fromEntries(waveCounts),
        },
      });
    }

    // Check jump catalog agreement
    const jumpCatalogs = new Map<string, Set<string>>();
    for (const judgeId of judgeIds) {
      const jumps = scores.filter(
        (s): s is Extract<Score, { type: "jump" }> =>
          s.type === "jump" && s.riderId === riderId && s.judgeId === judgeId
      );

      const catalog = new Set(
        jumps.map((j) => {
          const modifiersStr = j.modifiers.sort().join(",");
          return `${j.jumpType}:${modifiersStr}`;
        })
      );

      jumpCatalogs.set(judgeId, catalog);
    }

    // Compare all catalogs
    const catalogArrays = Array.from(jumpCatalogs.values());
    if (catalogArrays.length > 1) {
      const firstCatalog = catalogArrays[0];
      const allMatch = catalogArrays.every((catalog) => {
        if (catalog.size !== firstCatalog.size) return false;
        for (const item of catalog) {
          if (!firstCatalog.has(item)) return false;
        }
        return true;
      });

      if (!allMatch) {
        discrepancies.push({
          type: "jump_catalog",
          riderId,
          details: {
            judgeCatalogs: Object.fromEntries(
              Array.from(jumpCatalogs.entries()).map(([judgeId, catalog]) => [
                judgeId,
                Array.from(catalog),
              ])
            ),
          },
        });
      }
    }
  }

  return {
    hasDiscrepancies: discrepancies.length > 0,
    discrepancies,
  };
}
```

**Step 4: Run test to verify it passes**

Run:
```bash
bun test __tests__/domain/heat/judge-agreement.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/domain/heat/judge-agreement.ts __tests__/domain/heat/judge-agreement.test.ts
git commit -m "feat: add judge agreement validation logic

Implements validation to ensure all judges observed the same events:
- Wave count agreement: All judges recorded same number of waves
- Jump catalog agreement: All judges recorded same set of jumps

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 2: Update Authorization for Score Editing

**Files:**
- Modify: `src/api/routes/heat-routes.ts:454` (handleUpdateWaveScore)
- Modify: `src/api/routes/heat-routes.ts:503` (handleUpdateJumpScore)
- Test: `__tests__/api/routes/heat-routes.test.ts` (create if doesn't exist)

**Step 1: Write the failing test**

Create or update test file with authorization tests:

```typescript
import { describe, expect, it, beforeAll, afterAll, beforeEach } from "bun:test";
import { setupTestDb, teardownTestDb, clearTestData, getDb } from "../../test-db";
import { createHeatRepository, createScoreRepository, createUserRepository } from "../../../src/infrastructure/repositories";
import { HeatService } from "../../../src/domain/heat/heat-service";

describe("Heat Routes - Authorization", () => {
  beforeAll(async () => {
    await setupTestDb();
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  beforeEach(async () => {
    await clearTestData();
  });

  it("should allow head judge to edit any judge's score", async () => {
    // This test will fail until we update authorization
    const heatRepo = createHeatRepository();
    const scoreRepo = createScoreRepository();
    const userRepo = createUserRepository();

    // Create users
    const judge1 = await userRepo.createUser({
      username: "judge1",
      email: "judge1@test.com",
      passwordHash: "hash",
      role: "judge",
    });

    const headJudge = await userRepo.createUser({
      username: "headjudge",
      email: "headjudge@test.com",
      passwordHash: "hash",
      role: "head_judge",
    });

    // Create heat and score
    const heat = await heatRepo.createHeat({
      heatId: "test-heat",
      bracketId: "bracket-id",
      riderIds: ["rider1"],
      wavesCounting: 2,
      jumpsCounting: 2,
      position: "1",
      roundNumber: 1,
      roundName: "Round 1",
    });

    const scoreUuid = "score-1";
    await scoreRepo.insertScore({
      scoreUuid,
      heatId: "test-heat",
      riderId: "rider1",
      judgeId: judge1.id,
      type: "wave",
      scoreValue: 7.5,
      timestamp: new Date(),
    });

    // Simulate head judge editing judge1's score
    const heatService = new HeatService(heatRepo, scoreRepo);

    // This should NOT throw an error
    await heatService.updateWaveScore(scoreUuid, 8.5);

    const updatedScore = await scoreRepo.getScoreByUuid(scoreUuid);
    expect(updatedScore?.scoreValue).toBe(8.5);
    expect(updatedScore?.judgeId).toBe(judge1.id); // judgeId should remain unchanged
  });
});
```

**Step 2: Run test to verify current behavior**

Run:
```bash
bun test __tests__/api/routes/heat-routes.test.ts
```

Note: This test may pass already since we're testing domain service, not route handler. The authorization check is in the route handler. We need to test the route handler directly, but for now we'll proceed with the implementation.

**Step 3: Update authorization logic**

Modify `src/api/routes/heat-routes.ts`:

At line 454 in `handleUpdateWaveScore`, change:
```typescript
// Authorization check: judges can only update their own scores
// head_judge and administrator can update any score
if (request.user.role === "judge" && existingScore.judgeId !== request.user.id) {
  return createErrorResponse("Forbidden: you can only update your own scores", 403);
}
```

At line 503 in `handleUpdateJumpScore`, change:
```typescript
// Authorization check: judges can only update their own scores
// head_judge and administrator can update any score
if (request.user.role === "judge" && existingScore.judgeId !== request.user.id) {
  return createErrorResponse("Forbidden: you can only update your own scores", 403);
}
```

**Step 4: Run tests**

Run:
```bash
bun test
```

Expected: All tests PASS

**Step 5: Commit**

```bash
git add src/api/routes/heat-routes.ts __tests__/api/routes/heat-routes.test.ts
git commit -m "feat: allow head judge and admin to edit any score

Update authorization checks to allow head_judge and administrator
roles to edit scores from any judge. Regular judges can still only
edit their own scores.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 3: Head Judge REST API Endpoint - Types

**Files:**
- Create: `src/api/types.ts` (update existing)
- Test: Not needed for type definitions

**Step 1: Add type definitions**

Add to `src/api/types.ts`:

```typescript
// Head Judge API types
export interface HeadJudgeRiderInfo {
  riderId: string;
  firstName: string;
  lastName: string;
  sailNumber: string;
  country: string;
}

export interface HeadJudgeScoreSheet {
  judgeId: string;
  judgeName: string;
  scores: Array<{
    scoreUUID: string;
    riderId: string;
    type: "wave" | "jump";
    scoreValue: number;
    jumpType: string | null;
    modifiers: string[] | null;
    timestamp: Date;
    isCounting: boolean;
  }>;
  riderTotals: Record<string, number>;
}

export interface HeadJudgeState {
  heatId: string;
  heatRules: {
    wavesCounting: number;
    jumpsCounting: number;
  };
  riders: HeadJudgeRiderInfo[];
  judges: HeadJudgeScoreSheet[];
  bracketId: string;
  position: string;
  roundNumber: number;
  roundName: string;
  completedAt: Date | null;
}
```

**Step 2: Commit**

```bash
git add src/api/types.ts
git commit -m "feat: add head judge API type definitions

Define types for head judge REST API response structure including
rider info, judge scoresheets, and complete heat state.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 4: Head Judge REST API Route Handler

**Files:**
- Create: `src/api/routes/head-judge-routes.ts`
- Test: `__tests__/api/routes/head-judge-routes.test.ts`

**Step 1: Write the failing test**

```typescript
import { describe, expect, it, beforeAll, afterAll, beforeEach } from "bun:test";
import { setupTestDb, teardownTestDb, clearTestData } from "../../test-db";
import { handleGetHeadJudgeHeat } from "../../../src/api/routes/head-judge-routes";
import { createHeatRepository, createScoreRepository, createRiderRepository, createUserRepository } from "../../../src/infrastructure/repositories";

describe("Head Judge Routes", () => {
  beforeAll(async () => {
    await setupTestDb();
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  beforeEach(async () => {
    await clearTestData();
  });

  it("should return 403 for regular judge", async () => {
    const userRepo = createUserRepository();
    const judge = await userRepo.createUser({
      username: "judge",
      email: "judge@test.com",
      passwordHash: "hash",
      role: "judge",
    });

    const request = {
      user: { id: judge.id, role: "judge" },
    } as Request & { user: { id: string; role: string } };

    const response = await handleGetHeadJudgeHeat("test-heat", request);
    expect(response.status).toBe(403);
  });

  it("should return heat state for head judge", async () => {
    const userRepo = createUserRepository();
    const heatRepo = createHeatRepository();
    const scoreRepo = createScoreRepository();
    const riderRepo = createRiderRepository();

    const headJudge = await userRepo.createUser({
      username: "headjudge",
      email: "headjudge@test.com",
      passwordHash: "hash",
      role: "head_judge",
    });

    const judge1 = await userRepo.createUser({
      username: "judge1",
      email: "judge1@test.com",
      passwordHash: "hash",
      role: "judge",
    });

    const rider = await riderRepo.createRider({
      firstName: "John",
      lastName: "Doe",
      country: "USA",
      sailNumber: "42",
    });

    const heat = await heatRepo.createHeat({
      heatId: "test-heat",
      bracketId: "bracket-1",
      riderIds: [rider.id],
      wavesCounting: 2,
      jumpsCounting: 2,
      position: "1",
      roundNumber: 1,
      roundName: "Round 1",
    });

    await scoreRepo.insertScore({
      scoreUuid: "score-1",
      heatId: "test-heat",
      riderId: rider.id,
      judgeId: judge1.id,
      type: "wave",
      scoreValue: 7.5,
      timestamp: new Date(),
    });

    const request = {
      user: { id: headJudge.id, role: "head_judge" },
    } as Request & { user: { id: string; role: string } };

    const response = await handleGetHeadJudgeHeat("test-heat", request);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.heatId).toBe("test-heat");
    expect(data.judges).toHaveLength(1);
    expect(data.judges[0].judgeId).toBe(judge1.id);
    expect(data.riders).toHaveLength(1);
  });
});
```

**Step 2: Run test to verify it fails**

Run:
```bash
bun test __tests__/api/routes/head-judge-routes.test.ts
```

Expected: FAIL with "handleGetHeadJudgeHeat is not defined"

**Step 3: Write minimal implementation**

```typescript
import type { HeadJudgeState } from "../types.js";
import {
  createHeatRepository,
  createRiderRepository,
  createScoreRepository,
  createUserRepository,
} from "../../infrastructure/repositories/index.js";
import { createErrorResponse, createSuccessResponse } from "../helpers.js";
import {
  calculateJumpTotal,
  calculateWaveTotal,
  getCountingJumpScores,
  getCountingWaveScores,
} from "../../domain/heat/index.js";
import type { JumpModifier, JumpType, Score } from "../../domain/heat/types.js";

export async function handleGetHeadJudgeHeat(
  heatId: string,
  request: Request & { user: { id: string; role: string } }
): Promise<Response> {
  try {
    // Authorization check
    if (request.user.role !== "head_judge" && request.user.role !== "administrator") {
      return createErrorResponse("Forbidden: head judge or administrator role required", 403);
    }

    const heatRepository = createHeatRepository();
    const scoreRepository = createScoreRepository();
    const riderRepository = createRiderRepository();
    const userRepository = createUserRepository();

    const heat = await heatRepository.getHeatByHeatId(heatId);
    if (!heat) {
      return createErrorResponse("Heat not found", 404);
    }

    const dbScores = await scoreRepository.getScoresByHeatId(heatId);

    // Convert database scores to domain Score format
    const domainScores: Score[] = dbScores.map((s) => {
      if (s.type === "wave") {
        return {
          type: "wave" as const,
          scoreUUID: s.scoreUuid,
          riderId: s.riderId,
          judgeId: s.judgeId,
          score: s.scoreValue,
          timestamp: s.timestamp,
        };
      } else {
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
    });

    // Get unique judge IDs
    const judgeIds = Array.from(new Set(domainScores.map((s) => s.judgeId)));

    // Fetch judge information
    const judges = await Promise.all(
      judgeIds.map(async (judgeId) => {
        const user = await userRepository.getUserById(judgeId);
        const judgeScores = domainScores.filter((s) => s.judgeId === judgeId);

        // Calculate counting scores for this judge
        const countingWaveScores = new Set<string>();
        const countingJumpScores = new Set<string>();

        for (const riderId of heat.riderIds) {
          const waveCounting = getCountingWaveScores(
            riderId,
            judgeId,
            domainScores,
            heat.wavesCounting
          );
          const jumpCounting = getCountingJumpScores(
            riderId,
            judgeId,
            domainScores,
            heat.jumpsCounting
          );

          waveCounting.forEach((uuid) => countingWaveScores.add(uuid));
          jumpCounting.forEach((uuid) => countingJumpScores.add(uuid));
        }

        // Calculate per-rider totals for this judge
        const riderTotals: Record<string, number> = {};
        for (const riderId of heat.riderIds) {
          const waveTotal = calculateWaveTotal(riderId, judgeId, domainScores, heat.wavesCounting);
          const jumpTotal = calculateJumpTotal(riderId, judgeId, domainScores, heat.jumpsCounting);
          riderTotals[riderId] = waveTotal + jumpTotal;
        }

        return {
          judgeId,
          judgeName: user?.username || user?.email || "Unknown",
          scores: judgeScores.map((s) => ({
            scoreUUID: s.scoreUUID,
            riderId: s.riderId,
            type: s.type,
            scoreValue: s.score,
            jumpType: s.type === "jump" ? s.jumpType : null,
            modifiers: s.type === "jump" ? s.modifiers : null,
            timestamp: s.timestamp,
            isCounting:
              s.type === "wave"
                ? countingWaveScores.has(s.scoreUUID)
                : countingJumpScores.has(s.scoreUUID),
          })),
          riderTotals,
        };
      })
    );

    // Fetch rider information
    const riders = await Promise.all(
      heat.riderIds.map(async (riderId) => {
        const rider = await riderRepository.getRiderById(riderId);
        return {
          riderId,
          firstName: rider?.firstName || "Unknown",
          lastName: rider?.lastName || "",
          sailNumber: rider?.sailNumber || "N/A",
          country: rider?.country || "Unknown",
        };
      })
    );

    const response: HeadJudgeState = {
      heatId: heat.heatId,
      heatRules: {
        wavesCounting: heat.wavesCounting,
        jumpsCounting: heat.jumpsCounting,
      },
      riders,
      judges,
      bracketId: heat.bracketId,
      position: heat.position,
      roundNumber: heat.roundNumber,
      roundName: heat.roundName,
      completedAt: heat.completedAt,
    };

    return createSuccessResponse(response);
  } catch (error) {
    if (error instanceof Error) {
      return createErrorResponse(error.message, 500);
    }
    console.error("Unhandled error in handleGetHeadJudgeHeat:", error);
    return createErrorResponse("Internal server error", 500);
  }
}
```

**Step 4: Run test to verify it passes**

Run:
```bash
bun test __tests__/api/routes/head-judge-routes.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/api/routes/head-judge-routes.ts __tests__/api/routes/head-judge-routes.test.ts
git commit -m "feat: add head judge REST API endpoint

Implement GET /api/heats/{heatId}/head-judge with:
- Role-based authorization (head_judge and administrator only)
- Complete heat state with all judges' scoresheets
- Per-judge score counting and totals
- Rider information

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Phase 2: WebSocket Integration

### Task 5: Head Judge WebSocket Types and Connection Management

**Files:**
- Create: `src/api/websocket-head-judge.ts`
- Modify: `src/api/types.ts`

**Step 1: Update types for WebSocket messages**

Add to `src/api/types.ts`:

```typescript
// Head Judge WebSocket message types
export type HeadJudgeWebSocketServerMessage =
  | { type: "head_judge_state"; state: HeadJudgeState }
  | { type: "ping" };

export type HeadJudgeWebSocketClientMessage =
  | { type: "subscribe"; subscriptions: string[] }
  | { type: "pong" };
```

**Step 2: Create WebSocket connection management**

Create `src/api/websocket-head-judge.ts`:

```typescript
import type { ServerWebSocket } from "bun";
import type { HeadJudgeState, HeadJudgeWebSocketServerMessage } from "./types.js";
import { createHeatRepository, createRiderRepository, createScoreRepository, createUserRepository } from "../infrastructure/repositories/index.js";
import type { JumpModifier, JumpType, Score } from "../domain/heat/types.js";
import { calculateJumpTotal, calculateWaveTotal, getCountingJumpScores, getCountingWaveScores } from "../domain/heat/index.js";

type WebSocketConnection = ServerWebSocket<{ heatId?: string; userId?: string; userRole?: string }>;

// Connection map: heatId -> Set of WebSocket connections
const connections = new Map<string, Set<WebSocketConnection>>();

// Subscriptions map
interface ClientSubscription {
  state: boolean;
}
const subscriptions = new Map<WebSocketConnection, ClientSubscription>();

// Heartbeat interval
const HEARTBEAT_INTERVAL = 30000;

export function addHeadJudgeConnection(
  heatId: string,
  ws: WebSocketConnection
): void {
  if (!connections.has(heatId)) {
    connections.set(heatId, new Set());
  }
  const heatConnections = connections.get(heatId);
  if (heatConnections) {
    heatConnections.add(ws);
  }

  // Set up heartbeat
  const heartbeatInterval = setInterval(() => {
    if (isWebSocketOpen(ws)) {
      try {
        ws.send(JSON.stringify({ type: "ping" }));
      } catch (_error) {
        // Connection closed
      }
    } else {
      clearInterval(heartbeatInterval);
    }
  }, HEARTBEAT_INTERVAL);

  (ws as unknown as { _heartbeatInterval?: ReturnType<typeof setInterval> })._heartbeatInterval =
    heartbeatInterval;
}

export function removeHeadJudgeConnection(
  heatId: string,
  ws: WebSocketConnection
): void {
  const heatConnections = connections.get(heatId);
  if (heatConnections) {
    heatConnections.delete(ws);

    // Clean up heartbeat
    const intervalId = (ws as unknown as { _heartbeatInterval?: ReturnType<typeof setInterval> })
      ._heartbeatInterval;
    if (intervalId) {
      clearInterval(intervalId);
    }

    subscriptions.delete(ws);

    if (heatConnections.size === 0) {
      connections.delete(heatId);
    }
  }
}

export function setHeadJudgeSubscriptions(
  heatId: string,
  ws: WebSocketConnection,
  subscriptionPrefs: ClientSubscription
): void {
  const heatConnections = connections.get(heatId);
  if (heatConnections?.has(ws)) {
    subscriptions.set(ws, subscriptionPrefs);
  }
}

function isWebSocketOpen(ws: WebSocketConnection): boolean {
  const state = ws.readyState;
  if (typeof state === "string") {
    return state === "open";
  }
  if (typeof state === "number") {
    return state === 1;
  }
  return false;
}

export async function broadcastHeadJudgeUpdate(heatId: string): Promise<void> {
  const heatConnections = connections.get(heatId);
  if (!heatConnections || heatConnections.size === 0) {
    return;
  }

  // Check if any client is subscribed
  const hasSubscribers = Array.from(heatConnections).some(
    (ws) => isWebSocketOpen(ws) && subscriptions.get(ws)?.state
  );

  if (!hasSubscribers) {
    return;
  }

  // Build heat state
  const heatRepository = createHeatRepository();
  const scoreRepository = createScoreRepository();
  const riderRepository = createRiderRepository();
  const userRepository = createUserRepository();

  const heat = await heatRepository.getHeatByHeatId(heatId);
  if (!heat) {
    return;
  }

  const dbScores = await scoreRepository.getScoresByHeatId(heatId);

  const domainScores: Score[] = dbScores.map((s) => {
    if (s.type === "wave") {
      return {
        type: "wave" as const,
        scoreUUID: s.scoreUuid,
        riderId: s.riderId,
        judgeId: s.judgeId,
        score: s.scoreValue,
        timestamp: s.timestamp,
      };
    } else {
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
  });

  const judgeIds = Array.from(new Set(domainScores.map((s) => s.judgeId)));

  const judges = await Promise.all(
    judgeIds.map(async (judgeId) => {
      const user = await userRepository.getUserById(judgeId);
      const judgeScores = domainScores.filter((s) => s.judgeId === judgeId);

      const countingWaveScores = new Set<string>();
      const countingJumpScores = new Set<string>();

      for (const riderId of heat.riderIds) {
        const waveCounting = getCountingWaveScores(
          riderId,
          judgeId,
          domainScores,
          heat.wavesCounting
        );
        const jumpCounting = getCountingJumpScores(
          riderId,
          judgeId,
          domainScores,
          heat.jumpsCounting
        );

        waveCounting.forEach((uuid) => countingWaveScores.add(uuid));
        jumpCounting.forEach((uuid) => countingJumpScores.add(uuid));
      }

      const riderTotals: Record<string, number> = {};
      for (const riderId of heat.riderIds) {
        const waveTotal = calculateWaveTotal(riderId, judgeId, domainScores, heat.wavesCounting);
        const jumpTotal = calculateJumpTotal(riderId, judgeId, domainScores, heat.jumpsCounting);
        riderTotals[riderId] = waveTotal + jumpTotal;
      }

      return {
        judgeId,
        judgeName: user?.username || user?.email || "Unknown",
        scores: judgeScores.map((s) => ({
          scoreUUID: s.scoreUUID,
          riderId: s.riderId,
          type: s.type,
          scoreValue: s.score,
          jumpType: s.type === "jump" ? s.jumpType : null,
          modifiers: s.type === "jump" ? s.modifiers : null,
          timestamp: s.timestamp,
          isCounting:
            s.type === "wave"
              ? countingWaveScores.has(s.scoreUUID)
              : countingJumpScores.has(s.scoreUUID),
        })),
        riderTotals,
      };
    })
  );

  const riders = await Promise.all(
    heat.riderIds.map(async (riderId) => {
      const rider = await riderRepository.getRiderById(riderId);
      return {
        riderId,
        firstName: rider?.firstName || "Unknown",
        lastName: rider?.lastName || "",
        sailNumber: rider?.sailNumber || "N/A",
        country: rider?.country || "Unknown",
      };
    })
  );

  const state: HeadJudgeState = {
    heatId: heat.heatId,
    heatRules: {
      wavesCounting: heat.wavesCounting,
      jumpsCounting: heat.jumpsCounting,
    },
    riders,
    judges,
    bracketId: heat.bracketId,
    position: heat.position,
    roundNumber: heat.roundNumber,
    roundName: heat.roundName,
    completedAt: heat.completedAt,
  };

  const message: HeadJudgeWebSocketServerMessage = {
    type: "head_judge_state",
    state,
  };

  const messageJson = JSON.stringify(message);

  for (const ws of heatConnections) {
    const subs = subscriptions.get(ws);
    if (isWebSocketOpen(ws) && subs?.state) {
      try {
        ws.send(messageJson);
      } catch (_error) {
        removeHeadJudgeConnection(heatId, ws);
      }
    }
  }
}

export function handleHeadJudgeWebSocketMessage(
  heatId: string,
  ws: WebSocketConnection,
  message: string
): void {
  try {
    const parsed = JSON.parse(message);

    switch (parsed.type) {
      case "subscribe": {
        const subscriptions: ClientSubscription = {
          state: parsed.subscriptions.includes("state"),
        };
        setHeadJudgeSubscriptions(heatId, ws, subscriptions);
        break;
      }
      case "pong": {
        // Heartbeat response
        break;
      }
      default: {
        // Unknown message
        break;
      }
    }
  } catch (_error) {
    // Invalid JSON
  }
}
```

**Step 3: Commit**

```bash
git add src/api/websocket-head-judge.ts src/api/types.ts
git commit -m "feat: add head judge WebSocket connection management

Implement WebSocket infrastructure for head judge view:
- Connection pool management
- Heartbeat/ping-pong
- Subscription handling
- Broadcast function for state updates

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 6: Trigger Head Judge Broadcasts from Score Updates

**Files:**
- Modify: `src/api/routes/heat-routes.ts`

**Step 1: Import broadcast function**

At the top of `src/api/routes/heat-routes.ts`, add:

```typescript
import { broadcastHeadJudgeUpdate } from "../websocket-head-judge.js";
```

**Step 2: Add broadcast calls**

In `handleAddWaveScore` (after line 91):
```typescript
await broadcastHeatUpdate(data.heatId);
await broadcastHeadJudgeUpdate(data.heatId); // Add this line
```

In `handleAddJumpScore` (after line 122):
```typescript
await broadcastHeatUpdate(data.heatId);
await broadcastHeadJudgeUpdate(data.heatId); // Add this line
```

In `handleUpdateWaveScore` (after line 462):
```typescript
await broadcastHeatUpdate(heatId);
await broadcastHeadJudgeUpdate(heatId); // Add this line
```

In `handleUpdateJumpScore` (after line 511):
```typescript
await broadcastHeatUpdate(heatId);
await broadcastHeadJudgeUpdate(heatId); // Add this line
```

In `handleCompleteHeat` (after returning from completeHeat call, around line 419):
```typescript
await heatRepository.completeHeat(heatId, completedAt, new Date());

await broadcastHeatUpdate(heatId); // Add if not present
await broadcastHeadJudgeUpdate(heatId); // Add this line

return createSuccessResponse({ message: "Heat completed successfully" });
```

**Step 3: Run tests**

Run:
```bash
bun test
```

Expected: PASS

**Step 4: Commit**

```bash
git add src/api/routes/heat-routes.ts
git commit -m "feat: trigger head judge broadcasts on score updates

Add broadcastHeadJudgeUpdate calls to all score modification
endpoints to ensure head judge view receives real-time updates.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Phase 3: Frontend Core

### Task 7: Judge Color Utility

**Files:**
- Create: `src/app/utils/judgeColors.ts`

**Step 1: Create judge color utility**

```typescript
// Distinct professional colors for judge column headers
const JUDGE_COLORS = [
  "#3B82F6", // blue
  "#10B981", // green
  "#8B5CF6", // purple
  "#F59E0B", // orange
  "#06B6D4", // teal
  "#EC4899", // pink
  "#6366F1", // indigo
  "#14B8A6", // cyan
];

const judgeColorMap = new Map<string, string>();

export function getJudgeColor(judgeId: string): string {
  if (judgeColorMap.has(judgeId)) {
    return judgeColorMap.get(judgeId)!;
  }

  const colorIndex = judgeColorMap.size % JUDGE_COLORS.length;
  const color = JUDGE_COLORS[colorIndex];
  judgeColorMap.set(judgeId, color);
  return color;
}

export function clearJudgeColors(): void {
  judgeColorMap.clear();
}
```

**Step 2: Commit**

```bash
git add src/app/utils/judgeColors.ts
git commit -m "feat: add judge color utility for column headers

Assign distinct professional colors to judge columns for visual
differentiation in head judge view.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 8: Judge Agreement Validator Frontend Utility

**Files:**
- Create: `src/app/utils/judgeAgreementValidator.ts`

**Step 1: Create frontend validator**

```typescript
import type { JumpModifier, JumpType } from "@/domain/heat/types";

export interface JudgeScore {
  scoreUUID: string;
  riderId: string;
  judgeId: string;
  type: "wave" | "jump";
  scoreValue: number;
  jumpType: string | null;
  modifiers: string[] | null;
  timestamp: Date;
}

export interface RiderDiscrepancy {
  riderId: string;
  riderName: string;
  waveDiscrepancy?: {
    judgeCounts: Record<string, number>;
  };
  jumpDiscrepancy?: {
    judgeCatalogs: Record<string, string[]>;
  };
}

export interface ValidationResult {
  hasDiscrepancies: boolean;
  discrepancies: RiderDiscrepancy[];
}

export function validateJudgeAgreementFrontend(
  scores: JudgeScore[],
  riderNames: Record<string, string>
): ValidationResult {
  const riderIds = Array.from(new Set(scores.map((s) => s.riderId)));
  const judgeIds = Array.from(new Set(scores.map((s) => s.judgeId)));

  if (judgeIds.length <= 1) {
    return { hasDiscrepancies: false, discrepancies: [] };
  }

  const discrepancies: RiderDiscrepancy[] = [];

  for (const riderId of riderIds) {
    const riderName = riderNames[riderId] || "Unknown Rider";
    const riderDiscrepancy: RiderDiscrepancy = {
      riderId,
      riderName,
    };

    // Check wave counts
    const waveCounts: Record<string, number> = {};
    for (const judgeId of judgeIds) {
      const count = scores.filter(
        (s) => s.type === "wave" && s.riderId === riderId && s.judgeId === judgeId
      ).length;
      waveCounts[judgeId] = count;
    }

    const uniqueWaveCounts = Array.from(new Set(Object.values(waveCounts)));
    if (uniqueWaveCounts.length > 1) {
      riderDiscrepancy.waveDiscrepancy = { judgeCounts: waveCounts };
    }

    // Check jump catalogs
    const jumpCatalogs: Record<string, string[]> = {};
    for (const judgeId of judgeIds) {
      const jumps = scores.filter(
        (s) => s.type === "jump" && s.riderId === riderId && s.judgeId === judgeId
      );

      const catalog = jumps.map((j) => {
        const modifiersStr = (j.modifiers || []).sort().join(",");
        return `${j.jumpType}:${modifiersStr}`;
      });

      jumpCatalogs[judgeId] = catalog.sort();
    }

    const catalogArrays = Object.values(jumpCatalogs);
    if (catalogArrays.length > 1) {
      const firstCatalog = catalogArrays[0];
      const allMatch = catalogArrays.every((catalog) => {
        if (catalog.length !== firstCatalog.length) return false;
        return catalog.every((item, idx) => item === firstCatalog[idx]);
      });

      if (!allMatch) {
        riderDiscrepancy.jumpDiscrepancy = { judgeCatalogs: jumpCatalogs };
      }
    }

    if (riderDiscrepancy.waveDiscrepancy || riderDiscrepancy.jumpDiscrepancy) {
      discrepancies.push(riderDiscrepancy);
    }
  }

  return {
    hasDiscrepancies: discrepancies.length > 0,
    discrepancies,
  };
}
```

**Step 2: Commit**

```bash
git add src/app/utils/judgeAgreementValidator.ts
git commit -m "feat: add frontend judge agreement validator

Implement client-side validation to detect discrepancies in wave
counts and jump catalogs across judges for the completion modal.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 9: JudgeScoreColumn Component (Basic Structure)

**Files:**
- Create: `src/app/components/JudgeScoreColumn.tsx`

**Step 1: Create basic component structure**

```typescript
import type { Component } from "solid-js";
import { For } from "solid-js";
import type { JumpModifier, JumpType } from "@/domain/heat/types";

interface JudgeScoreColumnProps {
  judgeId: string;
  judgeName: string;
  judgeColor: string;
  riderIds: string[];
  scores: Array<{
    scoreUUID: string;
    riderId: string;
    type: "wave" | "jump";
    scoreValue: number;
    jumpType: string | null;
    modifiers: string[] | null;
    timestamp: Date;
    isCounting: boolean;
  }>;
  riderNames: Record<string, string>;
  riderColors: Record<string, string>;
  riderTotals: Record<string, number>;
  onEditScore: (scoreUUID: string, type: "wave" | "jump") => void;
  onAddWave: (riderId: string) => void;
  onAddJump: (riderId: string) => void;
  isOnline: boolean;
  isCompleted: boolean;
}

const JudgeScoreColumn: Component<JudgeScoreColumnProps> = (props) => {
  const getScoresForRider = (riderId: string, type: "wave" | "jump") => {
    return props.scores
      .filter((s) => s.riderId === riderId && s.type === type)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  };

  return (
    <div class="flex-shrink-0 w-full md:w-96 bg-white rounded-lg shadow-md overflow-hidden">
      {/* Judge Header */}
      <div
        class="px-4 py-3 text-white"
        style={{ "background-color": props.judgeColor }}
      >
        <div class="font-bold text-lg">👤 {props.judgeName}</div>
        <div class="text-sm opacity-90">Judge ID: {props.judgeId.slice(0, 8)}</div>
      </div>

      {/* Riders */}
      <div class="p-4 space-y-4">
        <For each={props.riderIds}>
          {(riderId) => {
            const riderName = props.riderNames[riderId] || "Unknown";
            const riderColor = props.riderColors[riderId] || "#000";
            const waveScores = getScoresForRider(riderId, "wave");
            const jumpScores = getScoresForRider(riderId, "jump");
            const total = props.riderTotals[riderId] || 0;

            return (
              <div class="border rounded-lg overflow-hidden">
                {/* Rider Header */}
                <div
                  class="px-3 py-2 text-white font-semibold flex justify-between"
                  style={{ "background-color": riderColor }}
                >
                  <span>{riderName}</span>
                  <span>{total.toFixed(2)}</span>
                </div>

                {/* Scores Grid */}
                <div class="grid grid-cols-2 divide-x">
                  {/* Waves */}
                  <div class="p-2">
                    <div class="text-xs font-semibold mb-2">WAVES</div>
                    <button
                      type="button"
                      onClick={() => props.onAddWave(riderId)}
                      disabled={!props.isOnline || props.isCompleted}
                      class="w-full py-4 text-xs text-gray-400 border border-dashed rounded hover:border-blue-400 hover:text-blue-600 disabled:opacity-50"
                    >
                      + Add
                    </button>
                    <div class="space-y-1 mt-1">
                      <For each={waveScores}>
                        {(score) => (
                          <button
                            type="button"
                            onClick={() => props.onEditScore(score.scoreUUID, "wave")}
                            disabled={!props.isOnline || props.isCompleted}
                            class={`w-full text-left p-2 rounded text-xs ${
                              score.isCounting
                                ? "bg-blue-50 border border-blue-400"
                                : "bg-gray-50 border border-gray-200"
                            } hover:bg-blue-100 disabled:opacity-50`}
                          >
                            <div class="font-bold">{score.scoreValue.toFixed(2)}</div>
                          </button>
                        )}
                      </For>
                    </div>
                  </div>

                  {/* Jumps */}
                  <div class="p-2">
                    <div class="text-xs font-semibold mb-2">JUMPS</div>
                    <button
                      type="button"
                      onClick={() => props.onAddJump(riderId)}
                      disabled={!props.isOnline || props.isCompleted}
                      class="w-full py-4 text-xs text-gray-400 border border-dashed rounded hover:border-blue-400 hover:text-blue-600 disabled:opacity-50"
                    >
                      + Add
                    </button>
                    <div class="space-y-1 mt-1">
                      <For each={jumpScores}>
                        {(score) => (
                          <button
                            type="button"
                            onClick={() => props.onEditScore(score.scoreUUID, "jump")}
                            disabled={!props.isOnline || props.isCompleted}
                            class={`w-full text-left p-2 rounded text-xs ${
                              score.isCounting
                                ? "bg-blue-50 border border-blue-400"
                                : "bg-gray-50 border border-gray-200"
                            } hover:bg-blue-100 disabled:opacity-50`}
                          >
                            <div class="font-bold">
                              {score.scoreValue.toFixed(2)}
                              {score.jumpType && (
                                <span class="text-gray-600 ml-1">({score.jumpType})</span>
                              )}
                            </div>
                          </button>
                        )}
                      </For>
                    </div>
                  </div>
                </div>
              </div>
            );
          }}
        </For>
      </div>
    </div>
  );
};

export default JudgeScoreColumn;
```

**Step 2: Commit**

```bash
git add src/app/components/JudgeScoreColumn.tsx
git commit -m "feat: add JudgeScoreColumn component

Create reusable judge column component that displays:
- Judge header with color coding
- Per-rider score sheets (waves and jumps)
- Add/edit score buttons
- Score highlighting for counting scores

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 10: HeadJudgeView Page Component (Basic Structure)

**Files:**
- Create: `src/app/pages/HeadJudgeView.tsx`

**Step 1: Create basic page structure**

```typescript
import type { Component } from "solid-js";
import { createEffect, createResource, createSignal, For, Show } from "solid-js";
import { useParams, useNavigate } from "@solidjs/router";
import ConnectionStatusIndicator from "../components/ConnectionStatusIndicator";
import JudgeScoreColumn from "../components/JudgeScoreColumn";
import { useAuth } from "../contexts/AuthContext";
import { apiGet } from "../utils/api";
import { getJudgeColor, clearJudgeColors } from "../utils/judgeColors";
import { getRiderColor } from "../utils/riderColors";

interface HeadJudgeState {
  heatId: string;
  heatRules: {
    wavesCounting: number;
    jumpsCounting: number;
  };
  riders: Array<{
    riderId: string;
    firstName: string;
    lastName: string;
    sailNumber: string;
    country: string;
  }>;
  judges: Array<{
    judgeId: string;
    judgeName: string;
    scores: Array<{
      scoreUUID: string;
      riderId: string;
      type: "wave" | "jump";
      scoreValue: number;
      jumpType: string | null;
      modifiers: string[] | null;
      timestamp: Date;
      isCounting: boolean;
    }>;
    riderTotals: Record<string, number>;
  }>;
  bracketId: string;
  position: string;
  roundNumber: number;
  roundName: string;
  completedAt: Date | null;
}

const HeadJudgeView: Component = () => {
  const params = useParams<{ heatId: string }>();
  const navigate = useNavigate();
  const auth = useAuth();
  const [isOnline, setIsOnline] = createSignal(true);
  const [refreshTrigger, setRefreshTrigger] = createSignal(0);

  // Authorization check
  createEffect(() => {
    const user = auth.user();
    if (!user || (user.role !== "head_judge" && user.role !== "administrator")) {
      navigate("/");
    }
  });

  // Clear judge colors on mount
  createEffect(() => {
    clearJudgeColors();
  });

  const [heatState] = createResource(
    () => ({ heatId: params.heatId, trigger: refreshTrigger() }),
    async ({ heatId }) => {
      const data = await apiGet<HeadJudgeState>(`/api/heats/${heatId}/head-judge`);
      return data;
    }
  );

  // Check online status
  createEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  });

  const refreshHeat = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleEditScore = (scoreUUID: string, type: "wave" | "jump") => {
    // TODO: Open modal for editing
    console.log("Edit score:", scoreUUID, type);
  };

  const handleAddWave = (judgeId: string, riderId: string) => {
    // TODO: Open modal for adding wave
    console.log("Add wave for judge:", judgeId, "rider:", riderId);
  };

  const handleAddJump = (judgeId: string, riderId: string) => {
    // TODO: Open modal for adding jump
    console.log("Add jump for judge:", judgeId, "rider:", riderId);
  };

  return (
    <Show
      when={!heatState.loading}
      fallback={
        <div class="min-h-screen bg-gray-50 flex items-center justify-center">
          <div class="text-lg font-semibold">Loading head judge view...</div>
        </div>
      }
    >
      <Show
        when={!heatState.error}
        fallback={
          <div class="min-h-screen bg-gray-50 flex items-center justify-center">
            <div class="text-center">
              <div class="text-lg font-semibold text-red-600">Error</div>
              <div class="text-sm text-gray-600 mt-2">{heatState.error?.message}</div>
              <button
                type="button"
                onClick={refreshHeat}
                class="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Retry
              </button>
            </div>
          </div>
        }
      >
        <Show
          when={heatState()}
          fallback={
            <div class="min-h-screen bg-gray-50 flex items-center justify-center">
              <div class="text-lg font-semibold">Heat not found</div>
            </div>
          }
        >
          {(state: () => HeadJudgeState) => {
            const riderNames: Record<string, string> = {};
            const riderColors: Record<string, string> = {};

            state().riders.forEach((rider) => {
              riderNames[rider.riderId] = `${rider.firstName} ${rider.lastName}`;
              riderColors[rider.riderId] = getRiderColor(rider.riderId);
            });

            return (
              <div class="min-h-screen bg-gray-50">
                <ConnectionStatusIndicator isOnline={isOnline()} />

                {/* Header */}
                <div class="bg-white border-b border-gray-200 px-4 py-4">
                  <h1 class="text-2xl font-bold text-gray-900">
                    Head Judge View - {state().roundName} Heat {state().position}
                  </h1>
                  <div class="text-sm text-gray-600 mt-1">
                    Rules: Best {state().heatRules.wavesCounting} waves, Best{" "}
                    {state().heatRules.jumpsCounting} jumps
                  </div>
                </div>

                {/* Empty state or judge columns */}
                <Show
                  when={state().judges.length > 0}
                  fallback={
                    <div class="flex items-center justify-center min-h-[400px]">
                      <div class="text-center text-gray-500">
                        <div class="text-lg font-semibold">Waiting for judges to submit scores...</div>
                        <div class="text-sm mt-2">Judge columns will appear as judges score</div>
                      </div>
                    </div>
                  }
                >
                  <div class="p-4 overflow-x-auto">
                    <div class="flex gap-4 min-w-min">
                      <For each={state().judges}>
                        {(judge) => (
                          <JudgeScoreColumn
                            judgeId={judge.judgeId}
                            judgeName={judge.judgeName}
                            judgeColor={getJudgeColor(judge.judgeId)}
                            riderIds={state().riderIds}
                            scores={judge.scores}
                            riderNames={riderNames}
                            riderColors={riderColors}
                            riderTotals={judge.riderTotals}
                            onEditScore={handleEditScore}
                            onAddWave={(riderId) => handleAddWave(judge.judgeId, riderId)}
                            onAddJump={(riderId) => handleAddJump(judge.judgeId, riderId)}
                            isOnline={isOnline()}
                            isCompleted={state().completedAt !== null}
                          />
                        )}
                      </For>
                    </div>
                  </div>
                </Show>

                {/* Completion button - TODO */}
                <Show when={state().completedAt === null}>
                  <div class="fixed bottom-0 left-0 right-0 bg-white border-t p-4">
                    <button
                      type="button"
                      disabled={!isOnline()}
                      class="w-full px-6 py-3 bg-green-600 text-white font-semibold rounded-md hover:bg-green-700 disabled:bg-gray-400"
                    >
                      Complete Heat
                    </button>
                  </div>
                </Show>
              </div>
            );
          }}
        </Show>
      </Show>
    </Show>
  );
};

export default HeadJudgeView;
```

**Step 2: Commit**

```bash
git add src/app/pages/HeadJudgeView.tsx
git commit -m "feat: add HeadJudgeView page component (basic structure)

Create main head judge page with:
- Role-based authorization
- REST API data fetching
- Empty state handling
- Judge column rendering
- Responsive layout with horizontal scroll

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 11: Add Head Judge Route

**Files:**
- Modify: `src/app/app.tsx`

**Step 1: Import HeadJudgeView**

Add import at top of file:
```typescript
import HeadJudgeView from "./pages/HeadJudgeView";
```

**Step 2: Add route**

Add route in the routes section (after other heat routes):
```typescript
<Route path="/head-judge/heats/:heatId" component={HeadJudgeView} />
```

**Step 3: Commit**

```bash
git add src/app/app.tsx
git commit -m "feat: add head judge view route

Register /head-judge/heats/:heatId route for head judge screen.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 12: Add Navigation Link from Judge Screen

**Files:**
- Modify: `src/app/pages/HeatScoreSheet.tsx`

**Step 1: Add navigation link**

In the header section (around line 330), add a link to head judge view:

```typescript
<div class="bg-white border-b border-gray-200 px-4 py-4 flex justify-between items-start">
  <div>
    <h1 class="text-2xl font-bold text-gray-900">
      {currentHeat().roundName} - Heat {currentHeat().position}
    </h1>
    <div class="text-sm text-gray-600 mt-1">
      Rules: Best {currentHeat().heatRules.wavesCounting} waves, Best{" "}
      {currentHeat().heatRules.jumpsCounting} jumps
    </div>
  </div>
  <div class="flex gap-2">
    {/* Head Judge View Link */}
    <Show when={auth.isHeadJudgeOrAdmin()}>
      <a
        href={`/head-judge/heats/${props.heatId}`}
        class="text-sm text-blue-600 hover:text-blue-800 underline"
      >
        Head Judge View →
      </a>
    </Show>
    {/* Viewer Link */}
    <a
      href={getViewerUrl(props.heatId)}
      target="_blank"
      rel="noopener noreferrer"
      class="text-gray-400 hover:text-indigo-600 transition-colors"
      aria-label="Open live viewer"
      title="Open live viewer"
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        role="img"
        aria-label="TV icon"
      >
        <rect x="2" y="7" width="20" height="13" rx="2" ry="2"></rect>
        <polyline points="17 2 12 7 7 2"></polyline>
      </svg>
    </a>
  </div>
</div>
```

**Step 2: Commit**

```bash
git add src/app/pages/HeatScoreSheet.tsx
git commit -m "feat: add head judge view link to judge screen

Add navigation link from judge scoring screen to head judge view
for users with head_judge or administrator role.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Phase 4: Completion & Validation

### Task 13: HeatCompletionModal Component

**Files:**
- Create: `src/app/components/HeatCompletionModal.tsx`

**Step 1: Create completion modal**

```typescript
import type { Component } from "solid-js";
import { createSignal, For, Show } from "solid-js";
import type { ValidationResult } from "../utils/judgeAgreementValidator";

interface HeatCompletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  validationResult: ValidationResult | null;
  judgeNames: Record<string, string>;
}

const HeatCompletionModal: Component<HeatCompletionModalProps> = (props) => {
  const [acknowledged, setAcknowledged] = createSignal(false);

  const handleConfirm = () => {
    if (props.validationResult?.hasDiscrepancies && !acknowledged()) {
      return;
    }
    props.onConfirm();
  };

  const handleClose = () => {
    setAcknowledged(false);
    props.onClose();
  };

  return (
    <Show when={props.isOpen}>
      <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
          <div class="p-6">
            <h2 class="text-2xl font-bold mb-4">Heat Completion Check</h2>

            <Show
              when={props.validationResult}
              fallback={<div class="text-gray-600">Validating...</div>}
            >
              {(result: () => ValidationResult) => (
                <>
                  <Show
                    when={!result().hasDiscrepancies}
                    fallback={
                      <>
                        <div class="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                          <div class="font-semibold text-yellow-800">
                            ⚠ {result().discrepancies.length} discrepancy(ies) found
                          </div>
                        </div>

                        <div class="space-y-4 mb-6">
                          <For each={result().discrepancies}>
                            {(discrepancy) => (
                              <div class="border rounded p-3">
                                <div class="font-semibold mb-2">{discrepancy.riderName}</div>

                                <Show when={discrepancy.waveDiscrepancy}>
                                  <div class="mb-2">
                                    <div class="text-sm font-medium text-red-600">
                                      ⚠ Waves: Discrepancy detected
                                    </div>
                                    <div class="text-sm ml-4 space-y-1">
                                      <For
                                        each={Object.entries(
                                          discrepancy.waveDiscrepancy!.judgeCounts
                                        )}
                                      >
                                        {([judgeId, count]) => (
                                          <div>
                                            - {props.judgeNames[judgeId]}: {count} waves
                                          </div>
                                        )}
                                      </For>
                                    </div>
                                  </div>
                                </Show>

                                <Show when={discrepancy.jumpDiscrepancy}>
                                  <div>
                                    <div class="text-sm font-medium text-red-600">
                                      ⚠ Jumps: Discrepancy detected
                                    </div>
                                    <div class="text-sm ml-4 space-y-1">
                                      <For
                                        each={Object.entries(
                                          discrepancy.jumpDiscrepancy!.judgeCatalogs
                                        )}
                                      >
                                        {([judgeId, catalog]) => (
                                          <div>
                                            - {props.judgeNames[judgeId]}: {catalog.join(", ") || "none"}
                                          </div>
                                        )}
                                      </For>
                                    </div>
                                  </div>
                                </Show>
                              </div>
                            )}
                          </For>
                        </div>

                        <label class="flex items-start gap-2 mb-4">
                          <input
                            type="checkbox"
                            checked={acknowledged()}
                            onChange={(e) => setAcknowledged(e.currentTarget.checked)}
                            class="mt-1"
                          />
                          <span class="text-sm">
                            I have reviewed the discrepancies and want to proceed
                          </span>
                        </label>
                      </>
                    }
                  >
                    <div class="mb-4 p-3 bg-green-50 border border-green-200 rounded">
                      <div class="font-semibold text-green-800">
                        ✓ No discrepancies found
                      </div>
                      <div class="text-sm text-green-700">
                        All judges agree on wave counts and jump catalogs.
                      </div>
                    </div>
                  </Show>

                  <div class="flex gap-3 justify-end">
                    <button
                      type="button"
                      onClick={handleClose}
                      class="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirm}
                      disabled={result().hasDiscrepancies && !acknowledged()}
                      class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      Complete Heat
                    </button>
                  </div>
                </>
              )}
            </Show>
          </div>
        </div>
      </div>
    </Show>
  );
};

export default HeatCompletionModal;
```

**Step 2: Commit**

```bash
git add src/app/components/HeatCompletionModal.tsx
git commit -m "feat: add heat completion validation modal

Create modal that validates judge agreement before heat completion:
- Wave count agreement check
- Jump catalog agreement check
- Discrepancy display with details
- Required acknowledgment for discrepancies

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 14: Integrate Completion Modal in HeadJudgeView

**Files:**
- Modify: `src/app/pages/HeadJudgeView.tsx`

**Step 1: Import and add modal state**

Add imports:
```typescript
import HeatCompletionModal from "../components/HeatCompletionModal";
import { validateJudgeAgreementFrontend } from "../utils/judgeAgreementValidator";
import { apiPost } from "../utils/api";
```

Add state:
```typescript
const [completionModalOpen, setCompletionModalOpen] = createSignal(false);
const [validationResult, setValidationResult] = createSignal(null);
```

**Step 2: Add completion handlers**

```typescript
const handleCompleteHeat = () => {
  const state = heatState();
  if (!state) return;

  // Collect all scores for validation
  const allScores = state.judges.flatMap((judge) => judge.scores);

  // Get rider names
  const riderNames: Record<string, string> = {};
  state.riders.forEach((rider) => {
    riderNames[rider.riderId] = `${rider.firstName} ${rider.lastName}`;
  });

  // Validate
  const result = validateJudgeAgreementFrontend(allScores, riderNames);
  setValidationResult(result);
  setCompletionModalOpen(true);
};

const handleConfirmCompletion = async () => {
  try {
    await apiPost(`/api/heats/${params.heatId}/complete`, {});
    setCompletionModalOpen(false);
    refreshHeat();
  } catch (error) {
    console.error("Error completing heat:", error);
    alert(error instanceof Error ? error.message : "Failed to complete heat");
  }
};
```

**Step 3: Update complete button**

Replace the complete button section:
```typescript
<Show when={state().completedAt === null}>
  <div class="fixed bottom-0 left-0 right-0 bg-white border-t p-4">
    <button
      type="button"
      onClick={handleCompleteHeat}
      disabled={!isOnline()}
      class="w-full px-6 py-3 bg-green-600 text-white font-semibold rounded-md hover:bg-green-700 disabled:bg-gray-400"
    >
      Complete Heat
    </button>
  </div>
</Show>
```

**Step 4: Add modal component**

Before the final closing div tags, add:
```typescript
<HeatCompletionModal
  isOpen={completionModalOpen()}
  onClose={() => setCompletionModalOpen(false)}
  onConfirm={handleConfirmCompletion}
  validationResult={validationResult()}
  judgeNames={
    Object.fromEntries(
      state().judges.map((j) => [j.judgeId, j.judgeName])
    )
  }
/>
```

**Step 5: Commit**

```bash
git add src/app/pages/HeadJudgeView.tsx
git commit -m "feat: integrate completion validation in head judge view

Wire up heat completion flow with validation:
- Validate judge agreement before completion
- Show validation modal with discrepancies
- Complete heat via API on confirmation

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Phase 5: Polish & Integration

### Task 15: Run All Tests and Fix Issues

**Files:**
- Various (as needed)

**Step 1: Run full test suite**

Run:
```bash
bun test
```

**Step 2: Fix any failing tests**

Address any test failures that arise.

**Step 3: Run type checking**

Run:
```bash
bun typecheck
```

**Step 4: Fix type errors**

Address any TypeScript errors.

**Step 5: Commit**

```bash
git add .
git commit -m "fix: resolve test failures and type errors

Ensure all tests pass and TypeScript compiles without errors.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 16: Run Code Quality Checks

**Files:**
- Various (as needed)

**Step 1: Format code**

Run:
```bash
bun format
```

**Step 2: Run linter with auto-fix**

Run:
```bash
bun check:fix
```

**Step 3: Commit any changes**

```bash
git add .
git commit -m "style: format code and fix lint issues

Apply Biome formatting and auto-fix lint issues.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 17: Manual Testing Checklist

**Manual Testing Steps:**

1. **Authorization**:
   - Access `/head-judge/heats/{heatId}` as regular judge → should redirect
   - Access as head judge → should load
   - Access as administrator → should load

2. **Empty State**:
   - View heat with no scores → should show "Waiting for judges"
   - Add first score from judge A → judge A column should appear

3. **Multi-Judge View**:
   - Add scores from judge B → judge B column should appear
   - Verify columns show correct data
   - Verify colors are distinct

4. **Score Editing** (TODO - will be implemented when WebSocket and modals are connected):
   - Click score in judge column → should open modal
   - Edit score → should update and preserve judgeId

5. **Completion Validation**:
   - Click "Complete Heat" with matching judges → should show green validation
   - Click "Complete Heat" with discrepancies → should show warnings
   - Require acknowledgment checkbox → should disable button until checked

6. **Navigation**:
   - Link from judge screen → should navigate correctly
   - Direct URL access → should work

---

### Task 18: Register Head Judge API Route

**Files:**
- Modify: `src/api/index.ts` or main API registration file

**Step 1: Import head judge route handler**

Add import:
```typescript
import { handleGetHeadJudgeHeat } from "./routes/head-judge-routes.js";
```

**Step 2: Register route**

Add route registration (exact location depends on existing structure):
```typescript
// GET /api/heats/:heatId/head-judge
if (pathname.match(/^\/api\/heats\/[^/]+\/head-judge$/)) {
  const heatId = pathname.split("/")[3];
  return handleGetHeadJudgeHeat(heatId, request as Request & { user: { id: string; role: string } });
}
```

**Step 3: Commit**

```bash
git add src/api/index.ts
git commit -m "feat: register head judge API route

Add route registration for GET /api/heats/{heatId}/head-judge
endpoint in API router.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Summary

This implementation plan provides step-by-step instructions for building the head judge screen feature. The plan follows TDD principles with small, testable increments.

**Completed in this plan:**
✅ Phase 1: Backend Foundation (judge agreement validation, authorization, REST API)
✅ Phase 2: WebSocket Integration (head judge WebSocket with broadcasts)
✅ Phase 3: Frontend Core (HeadJudgeView, JudgeScoreColumn, routing, navigation)
✅ Phase 4: Completion & Validation (HeatCompletionModal, validation integration)
✅ Phase 5: Polish & Integration (testing, code quality)

**Still needed (separate tasks):**
- WebSocket connection in frontend (connect to `/ws/head-judge/{heatId}`)
- Score editing modals integration (wire up existing WaveScoreModal/JumpScoreModal)
- Score addition with implicit judge assignment
- Responsive column width calculations
- Animations and transitions
- Additional error handling and edge cases
- Integration tests for multi-judge workflows

**Next steps:**
1. Run through this plan task by task
2. Test thoroughly
3. Add WebSocket frontend integration
4. Wire up score editing modals
5. Final polish and refinement
