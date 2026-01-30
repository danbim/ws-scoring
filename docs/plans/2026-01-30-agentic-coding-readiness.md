# Agentic Coding Readiness: Tests & Type Safety

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Improve test coverage and type safety so AI agents can modify the codebase with high velocity and high confidence.

**Architecture:** Three phases — first add tests for critical untested business logic and API routes, then fix type safety gaps that undermine TypeScript's compile-time guarantees, then clean up dead code left from the HTTP→oRPC migration.

**Tech Stack:** Bun Test, PGlite, Zod, oRPC, Drizzle ORM, TypeScript strict mode

---

## Phase 1: Critical Test Coverage

### Task 1: HeatService unit tests — addWaveScore / addJumpScore

**Files:**
- Create: `__tests__/domain/heat/heat-service.test.ts`
- Reference: `src/domain/heat/heat-service.ts`
- Reference: `src/domain/heat/errors.ts`
- Reference: `src/domain/heat/repositories.ts`

**Step 1: Create test file with mock repositories and happy-path tests**

```typescript
// __tests__/domain/heat/heat-service.test.ts
import { beforeEach, describe, expect, it, mock } from "bun:test";
import {
  HeatCompletedError,
  HeatDoesNotExistError,
  RiderNotInHeatError,
  ScoreMustBeInValidRangeError,
  ScoreUUIDAlreadyExistsError,
} from "../../../src/domain/heat/errors.js";
import { HeatService } from "../../../src/domain/heat/heat-service.js";
import type { Heat, HeatRepository, Score, ScoreRepository } from "../../../src/domain/heat/repositories.js";

function createMockHeat(overrides: Partial<Heat> = {}): Heat {
  return {
    id: "uuid-1",
    heatId: "heat-1",
    bracketId: "bracket-1",
    riderIds: ["rider-1", "rider-2"],
    wavesCounting: 2,
    jumpsCounting: 1,
    position: "QF1",
    roundNumber: 1,
    roundName: "Quarter Finals",
    completedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function createMockScore(overrides: Partial<Score> = {}): Score {
  return {
    id: "uuid-score-1",
    scoreUuid: "score-1",
    heatId: "heat-1",
    riderId: "rider-1",
    judgeId: "judge-1",
    type: "wave",
    scoreValue: 7.5,
    jumpType: null,
    jumpModifiers: null,
    timestamp: new Date(),
    createdAt: new Date(),
    ...overrides,
  };
}

function createMockRepos() {
  const heatRepo: HeatRepository = {
    createHeat: mock(() => Promise.resolve(createMockHeat())),
    getHeatByHeatId: mock(() => Promise.resolve(createMockHeat())),
    getHeatsByBracketId: mock(() => Promise.resolve([])),
    getAllHeats: mock(() => Promise.resolve([])),
    updateHeat: mock(() => Promise.resolve(createMockHeat())),
    deleteHeat: mock(() => Promise.resolve()),
    createHeatWithBracketMetadata: mock(() => Promise.resolve()),
    completeHeat: mock(() => Promise.resolve()),
    markCompleted: mock(() => Promise.resolve()),
    addRiderToHeat: mock(() => Promise.resolve()),
    getHeatRiderIds: mock(() => Promise.resolve([])),
    getHeatMetadata: mock(() => Promise.resolve(null)),
  };

  const scoreRepo: ScoreRepository = {
    insertScore: mock(() => Promise.resolve()),
    getScoresByHeatId: mock(() => Promise.resolve([])),
    getScoreByUuid: mock(() => Promise.resolve(null)),
    updateScore: mock(() => Promise.resolve()),
    deleteScore: mock(() => Promise.resolve()),
  };

  return { heatRepo, scoreRepo };
}

describe("HeatService", () => {
  let service: HeatService;
  let heatRepo: HeatRepository;
  let scoreRepo: ScoreRepository;

  beforeEach(() => {
    const mocks = createMockRepos();
    heatRepo = mocks.heatRepo;
    scoreRepo = mocks.scoreRepo;
    service = new HeatService(heatRepo, scoreRepo);
  });

  describe("addWaveScore", () => {
    it("should insert a wave score for valid input", async () => {
      await service.addWaveScore("heat-1", "score-1", "rider-1", "judge-1", 7.5, new Date());

      expect(scoreRepo.insertScore).toHaveBeenCalledTimes(1);
      const call = (scoreRepo.insertScore as ReturnType<typeof mock>).mock.calls[0];
      expect(call[0]).toMatchObject({
        scoreUuid: "score-1",
        heatId: "heat-1",
        riderId: "rider-1",
        judgeId: "judge-1",
        type: "wave",
        scoreValue: 7.5,
      });
    });

    it("should accept score of exactly 0", async () => {
      await service.addWaveScore("heat-1", "score-1", "rider-1", "judge-1", 0, new Date());
      expect(scoreRepo.insertScore).toHaveBeenCalledTimes(1);
    });

    it("should accept score of exactly 10", async () => {
      await service.addWaveScore("heat-1", "score-1", "rider-1", "judge-1", 10, new Date());
      expect(scoreRepo.insertScore).toHaveBeenCalledTimes(1);
    });

    it("should throw HeatDoesNotExistError when heat not found", async () => {
      (heatRepo.getHeatByHeatId as ReturnType<typeof mock>).mockResolvedValue(null);

      expect(
        service.addWaveScore("missing", "score-1", "rider-1", "judge-1", 5, new Date())
      ).rejects.toBeInstanceOf(HeatDoesNotExistError);
    });

    it("should throw HeatCompletedError when heat is completed", async () => {
      (heatRepo.getHeatByHeatId as ReturnType<typeof mock>).mockResolvedValue(
        createMockHeat({ completedAt: new Date() })
      );

      expect(
        service.addWaveScore("heat-1", "score-1", "rider-1", "judge-1", 5, new Date())
      ).rejects.toBeInstanceOf(HeatCompletedError);
    });

    it("should throw RiderNotInHeatError when rider not in heat", async () => {
      expect(
        service.addWaveScore("heat-1", "score-1", "unknown-rider", "judge-1", 5, new Date())
      ).rejects.toBeInstanceOf(RiderNotInHeatError);
    });

    it("should throw ScoreMustBeInValidRangeError for score > 10", async () => {
      expect(
        service.addWaveScore("heat-1", "score-1", "rider-1", "judge-1", 10.1, new Date())
      ).rejects.toBeInstanceOf(ScoreMustBeInValidRangeError);
    });

    it("should throw ScoreMustBeInValidRangeError for score < 0", async () => {
      expect(
        service.addWaveScore("heat-1", "score-1", "rider-1", "judge-1", -0.1, new Date())
      ).rejects.toBeInstanceOf(ScoreMustBeInValidRangeError);
    });

    it("should throw ScoreUUIDAlreadyExistsError for duplicate UUID", async () => {
      (scoreRepo.getScoreByUuid as ReturnType<typeof mock>).mockResolvedValue(createMockScore());

      expect(
        service.addWaveScore("heat-1", "score-1", "rider-1", "judge-1", 5, new Date())
      ).rejects.toBeInstanceOf(ScoreUUIDAlreadyExistsError);
    });
  });

  describe("addJumpScore", () => {
    it("should insert a jump score with type and modifiers", async () => {
      await service.addJumpScore(
        "heat-1", "score-1", "rider-1", "judge-1", 8.0,
        "forward", ["oneHanded"], new Date()
      );

      expect(scoreRepo.insertScore).toHaveBeenCalledTimes(1);
      const call = (scoreRepo.insertScore as ReturnType<typeof mock>).mock.calls[0];
      expect(call[0]).toMatchObject({
        type: "jump",
        jumpType: "forward",
        jumpModifiers: ["oneHanded"],
      });
    });

    it("should insert a jump score with empty modifiers", async () => {
      await service.addJumpScore(
        "heat-1", "score-1", "rider-1", "judge-1", 6.0,
        "backloop", [], new Date()
      );

      const call = (scoreRepo.insertScore as ReturnType<typeof mock>).mock.calls[0];
      expect(call[0].jumpModifiers).toEqual([]);
    });

    it("should throw HeatDoesNotExistError when heat not found", async () => {
      (heatRepo.getHeatByHeatId as ReturnType<typeof mock>).mockResolvedValue(null);

      expect(
        service.addJumpScore("missing", "score-1", "rider-1", "judge-1", 5, "forward", [], new Date())
      ).rejects.toBeInstanceOf(HeatDoesNotExistError);
    });
  });
});
```

**Step 2: Run tests to verify they pass**

Run: `bun test __tests__/domain/heat/heat-service.test.ts`
Expected: All tests PASS

**Step 3: Commit**

```bash
git add __tests__/domain/heat/heat-service.test.ts
git commit -m "test: add HeatService unit tests for addWaveScore and addJumpScore"
```

---

### Task 2: HeatService unit tests — updateWaveScore / updateJumpScore / deleteScore

**Files:**
- Modify: `__tests__/domain/heat/heat-service.test.ts`

**Step 1: Add update and delete tests**

Add these describe blocks inside the existing `describe("HeatService")`:

```typescript
  describe("updateWaveScore", () => {
    it("should update a wave score value", async () => {
      (scoreRepo.getScoreByUuid as ReturnType<typeof mock>).mockResolvedValue(
        createMockScore({ type: "wave", heatId: "heat-1" })
      );

      await service.updateWaveScore("score-1", 9.0);

      expect(scoreRepo.updateScore).toHaveBeenCalledWith("score-1", { scoreValue: 9.0 });
    });

    it("should throw Error when score not found", async () => {
      expect(service.updateWaveScore("missing", 5)).rejects.toThrow("not found");
    });

    it("should throw Error when score is not a wave score", async () => {
      (scoreRepo.getScoreByUuid as ReturnType<typeof mock>).mockResolvedValue(
        createMockScore({ type: "jump" })
      );

      expect(service.updateWaveScore("score-1", 5)).rejects.toThrow("not a wave score");
    });

    it("should throw HeatCompletedError when heat is completed", async () => {
      (scoreRepo.getScoreByUuid as ReturnType<typeof mock>).mockResolvedValue(
        createMockScore({ type: "wave", heatId: "heat-1" })
      );
      (heatRepo.getHeatByHeatId as ReturnType<typeof mock>).mockResolvedValue(
        createMockHeat({ completedAt: new Date() })
      );

      expect(service.updateWaveScore("score-1", 5)).rejects.toBeInstanceOf(HeatCompletedError);
    });

    it("should throw ScoreMustBeInValidRangeError for invalid score", async () => {
      (scoreRepo.getScoreByUuid as ReturnType<typeof mock>).mockResolvedValue(
        createMockScore({ type: "wave", heatId: "heat-1" })
      );

      expect(service.updateWaveScore("score-1", 11)).rejects.toBeInstanceOf(
        ScoreMustBeInValidRangeError
      );
    });
  });

  describe("updateJumpScore", () => {
    it("should update a jump score with new value and type", async () => {
      (scoreRepo.getScoreByUuid as ReturnType<typeof mock>).mockResolvedValue(
        createMockScore({ type: "jump", heatId: "heat-1" })
      );

      await service.updateJumpScore("score-1", 8.5, "backloop", ["oneFooted"]);

      expect(scoreRepo.updateScore).toHaveBeenCalledWith("score-1", {
        scoreValue: 8.5,
        jumpType: "backloop",
        jumpModifiers: ["oneFooted"],
      });
    });

    it("should update with only scoreValue when optional params omitted", async () => {
      (scoreRepo.getScoreByUuid as ReturnType<typeof mock>).mockResolvedValue(
        createMockScore({ type: "jump", heatId: "heat-1" })
      );

      await service.updateJumpScore("score-1", 6.0);

      expect(scoreRepo.updateScore).toHaveBeenCalledWith("score-1", {
        scoreValue: 6.0,
        jumpType: undefined,
        jumpModifiers: undefined,
      });
    });

    it("should throw Error when score is not a jump score", async () => {
      (scoreRepo.getScoreByUuid as ReturnType<typeof mock>).mockResolvedValue(
        createMockScore({ type: "wave" })
      );

      expect(service.updateJumpScore("score-1", 5)).rejects.toThrow("not a jump score");
    });
  });

  describe("deleteScore", () => {
    it("should delete an existing score", async () => {
      (scoreRepo.getScoreByUuid as ReturnType<typeof mock>).mockResolvedValue(
        createMockScore({ heatId: "heat-1" })
      );

      await service.deleteScore("score-1");

      expect(scoreRepo.deleteScore).toHaveBeenCalledWith("score-1");
    });

    it("should throw Error when score not found", async () => {
      expect(service.deleteScore("missing")).rejects.toThrow("not found");
    });

    it("should throw HeatCompletedError when heat is completed", async () => {
      (scoreRepo.getScoreByUuid as ReturnType<typeof mock>).mockResolvedValue(
        createMockScore({ heatId: "heat-1" })
      );
      (heatRepo.getHeatByHeatId as ReturnType<typeof mock>).mockResolvedValue(
        createMockHeat({ completedAt: new Date() })
      );

      expect(service.deleteScore("score-1")).rejects.toBeInstanceOf(HeatCompletedError);
    });
  });
```

**Step 2: Run tests**

Run: `bun test __tests__/domain/heat/heat-service.test.ts`
Expected: All tests PASS

**Step 3: Commit**

```bash
git add __tests__/domain/heat/heat-service.test.ts
git commit -m "test: add HeatService tests for update and delete score operations"
```

---

### Task 3: HeatService unit tests — completeHeat

**Files:**
- Modify: `__tests__/domain/heat/heat-service.test.ts`

**Step 1: Add completeHeat tests**

This is the most complex method. It requires mocking the database transaction. Add to the `describe("HeatService")` block:

```typescript
  describe("completeHeat", () => {
    it("should mark heat as completed and advance winner", async () => {
      const scores: Score[] = [
        createMockScore({ riderId: "rider-1", type: "wave", scoreValue: 8.0 }),
        createMockScore({ riderId: "rider-1", type: "wave", scoreValue: 7.0, scoreUuid: "s2" }),
        createMockScore({ riderId: "rider-2", type: "wave", scoreValue: 5.0, scoreUuid: "s3" }),
        createMockScore({ riderId: "rider-2", type: "wave", scoreValue: 4.0, scoreUuid: "s4" }),
      ];

      // completeHeat calls getDb().transaction() which we need to mock
      // Since completeHeat uses the real DB, this test should be an integration test
      // We'll test the internal logic via score-calculator-repo tests instead
      // and test completeHeat as an integration test in Task 5
    });
  });
```

**NOTE:** `completeHeat` calls `getDb().transaction()` directly, making it hard to unit test with mocks. This method is better tested as an integration test (Task 5). For now, add a placeholder describe block with a comment, and we'll fill it in Task 5.

Replace the above with:

```typescript
  // completeHeat is tested as an integration test in __tests__/api/orpc/heats.test.ts
  // because it calls getDb().transaction() directly and requires PGlite
```

**Step 2: Add score-calculator-repo unit tests instead**

Create: `__tests__/domain/heat/score-calculator-repo.test.ts`

```typescript
import { describe, expect, it } from "bun:test";
import { calculateRiderScoreTotals } from "../../../src/domain/heat/score-calculator-repo.js";
import type { Score } from "../../../src/domain/heat/repositories.js";

function makeScore(overrides: Partial<Score> = {}): Score {
  return {
    id: "id-1",
    scoreUuid: "uuid-1",
    heatId: "heat-1",
    riderId: "rider-1",
    judgeId: "judge-1",
    type: "wave",
    scoreValue: 5.0,
    jumpType: null,
    jumpModifiers: null,
    timestamp: new Date(),
    createdAt: new Date(),
    ...overrides,
  };
}

describe("calculateRiderScoreTotals", () => {
  it("should return empty array for no scores", () => {
    const result = calculateRiderScoreTotals([], 2, 1);
    expect(result).toEqual([]);
  });

  it("should take top N wave scores per rider", () => {
    const scores: Score[] = [
      makeScore({ riderId: "r1", scoreValue: 9.0, scoreUuid: "s1" }),
      makeScore({ riderId: "r1", scoreValue: 7.0, scoreUuid: "s2" }),
      makeScore({ riderId: "r1", scoreValue: 5.0, scoreUuid: "s3" }), // not counted
    ];

    const result = calculateRiderScoreTotals(scores, 2, 1);
    expect(result).toHaveLength(1);
    expect(result[0].riderId).toBe("r1");
    expect(result[0].total).toBe(16.0); // 9 + 7, not 5
  });

  it("should take best score per jump type, then top N", () => {
    const scores: Score[] = [
      makeScore({ riderId: "r1", type: "jump", jumpType: "forward", scoreValue: 8.0, scoreUuid: "s1" }),
      makeScore({ riderId: "r1", type: "jump", jumpType: "forward", scoreValue: 6.0, scoreUuid: "s2" }), // worse forward, ignored
      makeScore({ riderId: "r1", type: "jump", jumpType: "backloop", scoreValue: 9.0, scoreUuid: "s3" }),
      makeScore({ riderId: "r1", type: "jump", jumpType: "tableTop", scoreValue: 3.0, scoreUuid: "s4" }), // not counted (jumpsCounting=1)
    ];

    // jumpsCounting=1: best of each type -> [backloop:9, forward:8, tableTop:3] -> take top 1 -> 9
    const result = calculateRiderScoreTotals(scores, 0, 1);
    expect(result[0].total).toBe(9.0);
  });

  it("should combine wave and jump totals", () => {
    const scores: Score[] = [
      makeScore({ riderId: "r1", type: "wave", scoreValue: 8.0, scoreUuid: "s1" }),
      makeScore({ riderId: "r1", type: "wave", scoreValue: 7.0, scoreUuid: "s2" }),
      makeScore({ riderId: "r1", type: "jump", jumpType: "forward", scoreValue: 6.0, scoreUuid: "s3" }),
    ];

    const result = calculateRiderScoreTotals(scores, 2, 1);
    expect(result[0].total).toBe(21.0); // 8 + 7 + 6
  });

  it("should sort riders by total score descending", () => {
    const scores: Score[] = [
      makeScore({ riderId: "r1", scoreValue: 5.0, scoreUuid: "s1" }),
      makeScore({ riderId: "r2", scoreValue: 9.0, scoreUuid: "s2" }),
      makeScore({ riderId: "r3", scoreValue: 7.0, scoreUuid: "s3" }),
    ];

    const result = calculateRiderScoreTotals(scores, 2, 0);
    expect(result[0].riderId).toBe("r2");
    expect(result[1].riderId).toBe("r3");
    expect(result[2].riderId).toBe("r1");
  });

  it("should handle rider with only jump scores (no waves)", () => {
    const scores: Score[] = [
      makeScore({ riderId: "r1", type: "jump", jumpType: "forward", scoreValue: 7.0, scoreUuid: "s1" }),
    ];

    const result = calculateRiderScoreTotals(scores, 2, 1);
    expect(result[0].total).toBe(7.0);
  });

  it("should handle rider with only wave scores (no jumps)", () => {
    const scores: Score[] = [
      makeScore({ riderId: "r1", type: "wave", scoreValue: 8.0, scoreUuid: "s1" }),
    ];

    const result = calculateRiderScoreTotals(scores, 2, 1);
    expect(result[0].total).toBe(8.0);
  });

  it("should handle wavesCounting=0 (waves excluded)", () => {
    const scores: Score[] = [
      makeScore({ riderId: "r1", type: "wave", scoreValue: 10.0, scoreUuid: "s1" }),
      makeScore({ riderId: "r1", type: "jump", jumpType: "forward", scoreValue: 5.0, scoreUuid: "s2" }),
    ];

    const result = calculateRiderScoreTotals(scores, 0, 1);
    expect(result[0].total).toBe(5.0); // wave not counted
  });

  it("should handle multiple riders correctly", () => {
    const scores: Score[] = [
      makeScore({ riderId: "r1", type: "wave", scoreValue: 8.0, scoreUuid: "s1" }),
      makeScore({ riderId: "r1", type: "wave", scoreValue: 6.0, scoreUuid: "s2" }),
      makeScore({ riderId: "r2", type: "wave", scoreValue: 9.0, scoreUuid: "s3" }),
      makeScore({ riderId: "r2", type: "wave", scoreValue: 7.0, scoreUuid: "s4" }),
    ];

    const result = calculateRiderScoreTotals(scores, 2, 0);
    expect(result[0]).toMatchObject({ riderId: "r2", total: 16.0 });
    expect(result[1]).toMatchObject({ riderId: "r1", total: 14.0 });
  });
});
```

**Step 3: Run tests**

Run: `bun test __tests__/domain/heat/score-calculator-repo.test.ts`
Expected: All tests PASS

**Step 4: Commit**

```bash
git add __tests__/domain/heat/score-calculator-repo.test.ts __tests__/domain/heat/heat-service.test.ts
git commit -m "test: add score-calculator-repo unit tests and note completeHeat integration strategy"
```

---

### Task 4: Extract shared oRPC test helpers

Before writing oRPC route tests, extract the shared test infrastructure from the seasons test into a reusable module.

**Files:**
- Create: `__tests__/api/orpc/helpers.ts`

**Step 1: Create shared oRPC test helpers**

```typescript
// __tests__/api/orpc/helpers.ts
import { RPCHandler } from "@orpc/server/fetch";
import { appRouter } from "../../../src/api/orpc/router.js";
import { getDb } from "../../../src/infrastructure/db/index.js";
import {
  brackets,
  contests,
  divisions,
  divisionParticipants,
  heats,
  riders,
  seasons,
  sessions,
  users,
} from "../../../src/infrastructure/db/schema.js";

export const rpcHandler = new RPCHandler(appRouter);

// Standard test IDs
export const ADMIN_USER_ID = "a0000000-0000-4000-a000-000000000a01";
export const JUDGE_USER_ID = "a0000000-0000-4000-a000-000000000a02";
export const HEAD_JUDGE_USER_ID = "a0000000-0000-4000-a000-000000000a03";
export const ADMIN_TOKEN = "b0000000-0000-4000-b000-000000000b01";
export const JUDGE_TOKEN = "b0000000-0000-4000-b000-000000000b02";
export const HEAD_JUDGE_TOKEN = "b0000000-0000-4000-b000-000000000b03";

export const TEST_SEASON_ID = "c0000000-0000-4000-a000-000000000c01";
export const TEST_CONTEST_ID = "c0000000-0000-4000-a000-000000000c02";
export const TEST_DIVISION_ID = "c0000000-0000-4000-a000-000000000c03";
export const TEST_BRACKET_ID = "c0000000-0000-4000-a000-000000000c04";
export const TEST_HEAT_ID = "test-heat-001";
export const TEST_RIDER_1_ID = "d0000000-0000-4000-a000-000000000d01";
export const TEST_RIDER_2_ID = "d0000000-0000-4000-a000-000000000d02";

type RpcData = unknown;

export interface RpcResult {
  status: number;
  data: RpcData;
}

/**
 * Call an oRPC procedure by dot-notation path.
 * E.g. rpc("season.list", undefined, `session_token=TOKEN`)
 */
export async function rpc(
  procedurePath: string,
  input?: unknown,
  cookie?: string
): Promise<RpcResult> {
  const urlPath = procedurePath.replace(/\./g, "/");
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (cookie) headers.cookie = cookie;
  const request = new Request(`http://localhost/rpc/${urlPath}`, {
    method: "POST",
    headers,
    body: input !== undefined ? JSON.stringify({ json: input, meta: [] }) : undefined,
  });
  const { matched, response } = await rpcHandler.handle(request, {
    prefix: "/rpc",
    context: { request },
  });
  if (!matched || !response) {
    throw new Error(`No procedure matched for path: ${urlPath}`);
  }
  const body = await response.json();
  return { status: response.status, data: body.json ?? body };
}

/** Shorthand: rpc call as admin */
export function rpcAsAdmin(path: string, input?: unknown) {
  return rpc(path, input, `session_token=${ADMIN_TOKEN}`);
}

/** Shorthand: rpc call as judge */
export function rpcAsJudge(path: string, input?: unknown) {
  return rpc(path, input, `session_token=${JUDGE_TOKEN}`);
}

/** Shorthand: rpc call as head judge */
export function rpcAsHeadJudge(path: string, input?: unknown) {
  return rpc(path, input, `session_token=${HEAD_JUDGE_TOKEN}`);
}

/**
 * Seed the standard users and sessions used across all oRPC tests.
 * Call in beforeEach after clearTestData.
 */
export async function seedTestUsers() {
  const db = await getDb();

  await db.insert(users).values([
    {
      id: ADMIN_USER_ID,
      username: "admin",
      email: null,
      passwordHash: "hashed",
      role: "administrator",
    },
    {
      id: JUDGE_USER_ID,
      username: "judge",
      email: null,
      passwordHash: "hashed",
      role: "judge",
    },
    {
      id: HEAD_JUDGE_USER_ID,
      username: "headjudge",
      email: null,
      passwordHash: "hashed",
      role: "head_judge",
    },
  ]);

  await db.insert(sessions).values([
    {
      userId: ADMIN_USER_ID,
      token: ADMIN_TOKEN,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
    {
      userId: JUDGE_USER_ID,
      token: JUDGE_TOKEN,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
    {
      userId: HEAD_JUDGE_USER_ID,
      token: HEAD_JUDGE_TOKEN,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  ]);
}

/**
 * Seed the full entity hierarchy needed for heat/score tests:
 * Season → Contest → Division → Bracket → Riders + Participants
 */
export async function seedTestHierarchy() {
  const db = await getDb();

  await db.insert(seasons).values({
    id: TEST_SEASON_ID,
    name: "Test Season",
    year: 2025,
    startDate: new Date("2025-01-01"),
    endDate: new Date("2025-12-31"),
  });

  await db.insert(contests).values({
    id: TEST_CONTEST_ID,
    seasonId: TEST_SEASON_ID,
    name: "Test Contest",
    location: "Test Location",
    startDate: new Date("2025-06-01"),
    endDate: new Date("2025-06-03"),
    status: "in_progress",
  });

  await db.insert(divisions).values({
    id: TEST_DIVISION_ID,
    contestId: TEST_CONTEST_ID,
    name: "Pro Men",
    category: "pro_men",
  });

  await db.insert(brackets).values({
    id: TEST_BRACKET_ID,
    divisionId: TEST_DIVISION_ID,
    name: "Main Bracket",
    format: "single_elimination",
    status: "active",
  });

  await db.insert(riders).values([
    {
      id: TEST_RIDER_1_ID,
      firstName: "John",
      lastName: "Doe",
      country: "USA",
      sailNumber: "US-1",
    },
    {
      id: TEST_RIDER_2_ID,
      firstName: "Jane",
      lastName: "Smith",
      country: "GBR",
      sailNumber: "GB-2",
    },
  ]);

  await db.insert(divisionParticipants).values([
    { divisionId: TEST_DIVISION_ID, riderId: TEST_RIDER_1_ID },
    { divisionId: TEST_DIVISION_ID, riderId: TEST_RIDER_2_ID },
  ]);
}

/**
 * Seed a test heat (requires seedTestHierarchy to have been called first).
 */
export async function seedTestHeat(heatId: string = TEST_HEAT_ID) {
  const db = await getDb();

  await db.insert(heats).values({
    heatId,
    bracketId: TEST_BRACKET_ID,
    riderIds: JSON.stringify([TEST_RIDER_1_ID, TEST_RIDER_2_ID]),
    wavesCounting: 2,
    jumpsCounting: 1,
    roundNumber: 1,
    roundName: "Quarter Finals",
    position: "QF1",
  });
}
```

**Step 2: Refactor seasons test to use shared helpers**

Update `__tests__/api/orpc/seasons.test.ts` to import from the new helpers module. Replace the local constants, `rpc` function, and user seeding with imports from `./helpers.js`.

**Step 3: Run tests to verify refactor didn't break anything**

Run: `bun test __tests__/api/orpc/seasons.test.ts`
Expected: All tests PASS

**Step 4: Commit**

```bash
git add __tests__/api/orpc/helpers.ts __tests__/api/orpc/seasons.test.ts
git commit -m "refactor: extract shared oRPC test helpers for reuse across route tests"
```

---

### Task 5: oRPC scores route tests

**Files:**
- Create: `__tests__/api/orpc/scores.test.ts`
- Reference: `src/api/orpc/routes/scores.ts`

**Step 1: Create scores route tests**

```typescript
// __tests__/api/orpc/scores.test.ts
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "bun:test";
import { clearTestData, setupTestDb, teardownTestDb } from "../../test-db.js";
import {
  JUDGE_USER_ID,
  HEAD_JUDGE_USER_ID,
  TEST_HEAT_ID,
  TEST_RIDER_1_ID,
  TEST_RIDER_2_ID,
  rpc,
  rpcAsAdmin,
  rpcAsHeadJudge,
  rpcAsJudge,
  seedTestHeat,
  seedTestHierarchy,
  seedTestUsers,
} from "./helpers.js";

describe("Score oRPC Procedures", () => {
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

  describe("addWave", () => {
    it("should add a wave score as judge", async () => {
      const result = await rpcAsJudge("score.addWave", {
        heatId: TEST_HEAT_ID,
        scoreUUID: "e0000000-0000-4000-a000-000000000e01",
        riderId: TEST_RIDER_1_ID,
        waveScore: 7.5,
      });

      expect(result.status).toBe(200);
      expect(result.data).toMatchObject({
        heatId: TEST_HEAT_ID,
        scoreUUID: "e0000000-0000-4000-a000-000000000e01",
        message: "Wave score added successfully",
      });
    });

    it("should return 401 without auth", async () => {
      const result = await rpc("score.addWave", {
        heatId: TEST_HEAT_ID,
        scoreUUID: "e0000000-0000-4000-a000-000000000e01",
        riderId: TEST_RIDER_1_ID,
        waveScore: 7.5,
      });
      expect(result.status).toBe(401);
    });
  });

  describe("updateWave", () => {
    const SCORE_UUID = "e0000000-0000-4000-a000-000000000e01";

    beforeEach(async () => {
      // Add a score first
      await rpcAsJudge("score.addWave", {
        heatId: TEST_HEAT_ID,
        scoreUUID: SCORE_UUID,
        riderId: TEST_RIDER_1_ID,
        waveScore: 5.0,
      });
    });

    it("should update own wave score as judge", async () => {
      const result = await rpcAsJudge("score.updateWave", {
        heatId: TEST_HEAT_ID,
        scoreUUID: SCORE_UUID,
        data: { waveScore: 8.0 },
      });

      expect(result.status).toBe(200);
      expect(result.data).toMatchObject({ message: "Wave score updated successfully" });
    });

    it("should allow head_judge to update any score", async () => {
      const result = await rpcAsHeadJudge("score.updateWave", {
        heatId: TEST_HEAT_ID,
        scoreUUID: SCORE_UUID,
        data: { waveScore: 9.0 },
      });

      expect(result.status).toBe(200);
    });

    it("should allow admin to update any score", async () => {
      const result = await rpcAsAdmin("score.updateWave", {
        heatId: TEST_HEAT_ID,
        scoreUUID: SCORE_UUID,
        data: { waveScore: 9.0 },
      });

      expect(result.status).toBe(200);
    });
  });

  describe("deleteWave", () => {
    const SCORE_UUID = "e0000000-0000-4000-a000-000000000e02";

    beforeEach(async () => {
      await rpcAsJudge("score.addWave", {
        heatId: TEST_HEAT_ID,
        scoreUUID: SCORE_UUID,
        riderId: TEST_RIDER_1_ID,
        waveScore: 6.0,
      });
    });

    it("should delete own wave score as judge", async () => {
      const result = await rpcAsJudge("score.deleteWave", {
        heatId: TEST_HEAT_ID,
        scoreUUID: SCORE_UUID,
      });

      expect(result.status).toBe(200);
      expect(result.data).toMatchObject({ message: "Wave score deleted successfully" });
    });

    it("should return 404 for non-existent score", async () => {
      const result = await rpcAsJudge("score.deleteWave", {
        heatId: TEST_HEAT_ID,
        scoreUUID: "e0000000-0000-4000-a000-nonexistent1",
      });

      expect(result.status).toBe(404);
    });
  });

  describe("addJump", () => {
    it("should add a jump score with type and modifiers", async () => {
      const result = await rpcAsJudge("score.addJump", {
        heatId: TEST_HEAT_ID,
        scoreUUID: "e0000000-0000-4000-a000-000000000e03",
        riderId: TEST_RIDER_1_ID,
        jumpScore: 8.0,
        jumpType: "forward",
        modifiers: ["oneHanded"],
      });

      expect(result.status).toBe(200);
      expect(result.data).toMatchObject({
        message: "Jump score added successfully",
      });
    });

    it("should add a jump score with empty modifiers", async () => {
      const result = await rpcAsJudge("score.addJump", {
        heatId: TEST_HEAT_ID,
        scoreUUID: "e0000000-0000-4000-a000-000000000e04",
        riderId: TEST_RIDER_2_ID,
        jumpScore: 6.5,
        jumpType: "backloop",
        modifiers: [],
      });

      expect(result.status).toBe(200);
    });
  });

  describe("updateJump", () => {
    const SCORE_UUID = "e0000000-0000-4000-a000-000000000e05";

    beforeEach(async () => {
      await rpcAsJudge("score.addJump", {
        heatId: TEST_HEAT_ID,
        scoreUUID: SCORE_UUID,
        riderId: TEST_RIDER_1_ID,
        jumpScore: 5.0,
        jumpType: "forward",
        modifiers: [],
      });
    });

    it("should update own jump score", async () => {
      const result = await rpcAsJudge("score.updateJump", {
        heatId: TEST_HEAT_ID,
        scoreUUID: SCORE_UUID,
        data: { jumpScore: 8.0, jumpType: "backloop", modifiers: ["oneFooted"] },
      });

      expect(result.status).toBe(200);
    });
  });

  describe("deleteJump", () => {
    const SCORE_UUID = "e0000000-0000-4000-a000-000000000e06";

    beforeEach(async () => {
      await rpcAsJudge("score.addJump", {
        heatId: TEST_HEAT_ID,
        scoreUUID: SCORE_UUID,
        riderId: TEST_RIDER_1_ID,
        jumpScore: 7.0,
        jumpType: "tableTop",
        modifiers: [],
      });
    });

    it("should delete own jump score", async () => {
      const result = await rpcAsJudge("score.deleteJump", {
        heatId: TEST_HEAT_ID,
        scoreUUID: SCORE_UUID,
      });

      expect(result.status).toBe(200);
    });

    it("should return 400 when trying to delete wave score via deleteJump", async () => {
      // Add a wave score
      await rpcAsJudge("score.addWave", {
        heatId: TEST_HEAT_ID,
        scoreUUID: "e0000000-0000-4000-a000-000000000e07",
        riderId: TEST_RIDER_1_ID,
        waveScore: 5.0,
      });

      const result = await rpcAsJudge("score.deleteJump", {
        heatId: TEST_HEAT_ID,
        scoreUUID: "e0000000-0000-4000-a000-000000000e07",
      });

      expect(result.status).toBe(400);
    });
  });
});
```

**Step 2: Run tests**

Run: `bun test __tests__/api/orpc/scores.test.ts`
Expected: All tests PASS

**Step 3: Commit**

```bash
git add __tests__/api/orpc/scores.test.ts
git commit -m "test: add oRPC scores route tests with permission checks"
```

---

### Task 6: oRPC heats route tests

**Files:**
- Create: `__tests__/api/orpc/heats.test.ts`
- Reference: `src/api/orpc/routes/heats.ts`

**Step 1: Create heats route tests**

```typescript
// __tests__/api/orpc/heats.test.ts
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "bun:test";
import { clearTestData, setupTestDb, teardownTestDb } from "../../test-db.js";
import {
  TEST_BRACKET_ID,
  TEST_HEAT_ID,
  TEST_RIDER_1_ID,
  TEST_RIDER_2_ID,
  rpc,
  rpcAsAdmin,
  rpcAsJudge,
  seedTestHeat,
  seedTestHierarchy,
  seedTestUsers,
} from "./helpers.js";

describe("Heat oRPC Procedures", () => {
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
  });

  describe("listHeats", () => {
    it("should list heats by bracket", async () => {
      await seedTestHeat();

      const result = await rpcAsJudge("heat.list", { bracketId: TEST_BRACKET_ID });

      expect(result.status).toBe(200);
      expect((result.data as { heats: unknown[] }).heats).toHaveLength(1);
    });

    it("should return empty list when no heats exist", async () => {
      const result = await rpcAsJudge("heat.list", { bracketId: TEST_BRACKET_ID });

      expect(result.status).toBe(200);
      expect((result.data as { heats: unknown[] }).heats).toHaveLength(0);
    });

    it("should return 401 without auth", async () => {
      const result = await rpc("heat.list", { bracketId: TEST_BRACKET_ID });
      expect(result.status).toBe(401);
    });
  });

  describe("getHeat", () => {
    it("should return heat details with scores", async () => {
      await seedTestHeat();

      const result = await rpcAsJudge("heat.get", { heatId: TEST_HEAT_ID });

      expect(result.status).toBe(200);
      const data = result.data as Record<string, unknown>;
      expect(data.heatId).toBe(TEST_HEAT_ID);
      expect(data.riderIds).toEqual([TEST_RIDER_1_ID, TEST_RIDER_2_ID]);
    });

    it("should return 404 for non-existent heat", async () => {
      const result = await rpcAsJudge("heat.get", { heatId: "nonexistent" });
      expect(result.status).toBe(404);
    });
  });

  describe("createHeat", () => {
    it("should create a heat as judge", async () => {
      const result = await rpcAsJudge("heat.create", {
        heatId: "new-heat-1",
        riderIds: [TEST_RIDER_1_ID],
        heatRules: { wavesCounting: 2, jumpsCounting: 1 },
        bracketId: TEST_BRACKET_ID,
        position: "SF1",
        roundNumber: 2,
        roundName: "Semi Finals",
      });

      expect(result.status).toBe(200);
      const data = result.data as Record<string, unknown>;
      expect(data.heatId).toBe("new-heat-1");
    });

    it("should return 400 for duplicate heat ID", async () => {
      await seedTestHeat();

      const result = await rpcAsJudge("heat.create", {
        heatId: TEST_HEAT_ID,
        riderIds: [TEST_RIDER_1_ID],
        heatRules: { wavesCounting: 2, jumpsCounting: 1 },
        bracketId: TEST_BRACKET_ID,
        position: "SF1",
        roundNumber: 2,
        roundName: "Semi Finals",
      });

      expect(result.status).toBe(400);
    });
  });

  describe("updateHeat", () => {
    it("should update heat as admin", async () => {
      await seedTestHeat();

      const result = await rpcAsAdmin("heat.update", {
        heatId: TEST_HEAT_ID,
        data: { heatRules: { wavesCounting: 3, jumpsCounting: 2 } },
      });

      expect(result.status).toBe(200);
    });

    it("should return 403 for judge", async () => {
      await seedTestHeat();

      const result = await rpcAsJudge("heat.update", {
        heatId: TEST_HEAT_ID,
        data: { heatRules: { wavesCounting: 3, jumpsCounting: 2 } },
      });

      expect(result.status).toBe(403);
    });
  });

  describe("deleteHeat", () => {
    it("should delete heat as admin", async () => {
      await seedTestHeat();

      const result = await rpcAsAdmin("heat.delete", { heatId: TEST_HEAT_ID });

      expect(result.status).toBe(200);
    });

    it("should return 403 for judge", async () => {
      await seedTestHeat();

      const result = await rpcAsJudge("heat.delete", { heatId: TEST_HEAT_ID });

      expect(result.status).toBe(403);
    });
  });

  describe("completeHeat", () => {
    it("should complete a heat with scores", async () => {
      await seedTestHeat();

      // Add some scores first
      await rpcAsJudge("score.addWave", {
        heatId: TEST_HEAT_ID,
        scoreUUID: "f0000000-0000-4000-a000-000000000f01",
        riderId: TEST_RIDER_1_ID,
        waveScore: 8.0,
      });
      await rpcAsJudge("score.addWave", {
        heatId: TEST_HEAT_ID,
        scoreUUID: "f0000000-0000-4000-a000-000000000f02",
        riderId: TEST_RIDER_2_ID,
        waveScore: 6.0,
      });

      const result = await rpcAsJudge("heat.complete", { heatId: TEST_HEAT_ID });

      expect(result.status).toBe(200);
      expect(result.data).toMatchObject({ message: "Heat completed successfully" });
    });

    it("should complete a heat with no scores", async () => {
      await seedTestHeat();

      const result = await rpcAsJudge("heat.complete", { heatId: TEST_HEAT_ID });

      expect(result.status).toBe(200);
    });
  });

  describe("getViewer", () => {
    it("should return viewer state without auth (public)", async () => {
      await seedTestHeat();

      const result = await rpc("heat.getViewer", { heatId: TEST_HEAT_ID });

      expect(result.status).toBe(200);
      const data = result.data as Record<string, unknown>;
      expect(data.heatId).toBe(TEST_HEAT_ID);
      expect(data.riders).toBeDefined();
    });

    it("should return 404 for non-existent heat", async () => {
      const result = await rpc("heat.getViewer", { heatId: "nonexistent" });
      expect(result.status).toBe(404);
    });
  });

  describe("getHeadJudge", () => {
    it("should return head judge view as admin", async () => {
      await seedTestHeat();

      const result = await rpcAsAdmin("heat.getHeadJudge", { heatId: TEST_HEAT_ID });

      expect(result.status).toBe(200);
      const data = result.data as Record<string, unknown>;
      expect(data.heatId).toBe(TEST_HEAT_ID);
      expect(data.riders).toBeDefined();
      expect(data.judges).toBeDefined();
      expect(data.averagedTotals).toBeDefined();
    });

    it("should return 403 for regular judge", async () => {
      await seedTestHeat();

      const result = await rpcAsJudge("heat.getHeadJudge", { heatId: TEST_HEAT_ID });

      expect(result.status).toBe(403);
    });
  });
});
```

**Step 2: Run tests**

Run: `bun test __tests__/api/orpc/heats.test.ts`
Expected: All tests PASS

**Step 3: Commit**

```bash
git add __tests__/api/orpc/heats.test.ts
git commit -m "test: add oRPC heats route tests including viewer and head judge endpoints"
```

---

### Task 7: oRPC CRUD route tests — contests, divisions, riders

**Files:**
- Create: `__tests__/api/orpc/contests.test.ts`
- Create: `__tests__/api/orpc/divisions.test.ts`
- Create: `__tests__/api/orpc/riders.test.ts`

These all follow the same CRUD test pattern as the seasons test. Each needs:
- list (authed), get (authed), create (admin only), update (admin only), delete (admin only)
- 401 without auth, 403 for judge on admin operations, 404 for non-existent entities

**Step 1: Create contests tests**

```typescript
// __tests__/api/orpc/contests.test.ts
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "bun:test";
import { clearTestData, setupTestDb, teardownTestDb } from "../../test-db.js";
import {
  TEST_CONTEST_ID,
  TEST_SEASON_ID,
  rpc,
  rpcAsAdmin,
  rpcAsJudge,
  seedTestHierarchy,
  seedTestUsers,
} from "./helpers.js";

describe("Contest oRPC Procedures", () => {
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
  });

  describe("listContests", () => {
    it("should list contests when authenticated", async () => {
      const result = await rpcAsJudge("contest.list", { seasonId: TEST_SEASON_ID });
      expect(result.status).toBe(200);
      expect((result.data as { contests: unknown[] }).contests).toHaveLength(1);
    });

    it("should return 401 without auth", async () => {
      const result = await rpc("contest.list");
      expect(result.status).toBe(401);
    });
  });

  describe("getContest", () => {
    it("should get contest by ID", async () => {
      const result = await rpcAsJudge("contest.get", { contestId: TEST_CONTEST_ID });
      expect(result.status).toBe(200);
      expect((result.data as { name: string }).name).toBe("Test Contest");
    });

    it("should return 404 for nonexistent contest", async () => {
      const result = await rpcAsJudge("contest.get", {
        contestId: "d0000000-0000-4000-a000-000000000999",
      });
      expect(result.status).toBe(404);
    });
  });

  describe("createContest", () => {
    it("should create contest as admin", async () => {
      const result = await rpcAsAdmin("contest.create", {
        seasonId: TEST_SEASON_ID,
        name: "New Contest",
        location: "Beach",
        startDate: "2025-07-01",
        endDate: "2025-07-03",
        status: "draft",
      });
      expect(result.status).toBe(200);
      expect((result.data as { name: string }).name).toBe("New Contest");
    });

    it("should return 403 for judge", async () => {
      const result = await rpcAsJudge("contest.create", {
        seasonId: TEST_SEASON_ID,
        name: "New Contest",
        location: "Beach",
        startDate: "2025-07-01",
        endDate: "2025-07-03",
        status: "draft",
      });
      expect(result.status).toBe(403);
    });
  });

  describe("updateContest", () => {
    it("should update contest as admin", async () => {
      const result = await rpcAsAdmin("contest.update", {
        contestId: TEST_CONTEST_ID,
        data: { name: "Updated Contest" },
      });
      expect(result.status).toBe(200);
      expect((result.data as { name: string }).name).toBe("Updated Contest");
    });

    it("should return 403 for judge", async () => {
      const result = await rpcAsJudge("contest.update", {
        contestId: TEST_CONTEST_ID,
        data: { name: "Updated" },
      });
      expect(result.status).toBe(403);
    });
  });

  describe("deleteContest", () => {
    it("should delete contest as admin", async () => {
      const result = await rpcAsAdmin("contest.delete", { contestId: TEST_CONTEST_ID });
      expect(result.status).toBe(200);
    });

    it("should return 403 for judge", async () => {
      const result = await rpcAsJudge("contest.delete", { contestId: TEST_CONTEST_ID });
      expect(result.status).toBe(403);
    });
  });
});
```

**Step 2: Create divisions tests**

```typescript
// __tests__/api/orpc/divisions.test.ts
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "bun:test";
import { clearTestData, setupTestDb, teardownTestDb } from "../../test-db.js";
import {
  TEST_CONTEST_ID,
  TEST_DIVISION_ID,
  rpc,
  rpcAsAdmin,
  rpcAsJudge,
  seedTestHierarchy,
  seedTestUsers,
} from "./helpers.js";

describe("Division oRPC Procedures", () => {
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
  });

  describe("listDivisions", () => {
    it("should list divisions by contest", async () => {
      const result = await rpcAsJudge("division.list", { contestId: TEST_CONTEST_ID });
      expect(result.status).toBe(200);
      expect((result.data as { divisions: unknown[] }).divisions).toHaveLength(1);
    });

    it("should return 401 without auth", async () => {
      const result = await rpc("division.list");
      expect(result.status).toBe(401);
    });
  });

  describe("getDivision", () => {
    it("should get division by ID", async () => {
      const result = await rpcAsJudge("division.get", { divisionId: TEST_DIVISION_ID });
      expect(result.status).toBe(200);
      expect((result.data as { name: string }).name).toBe("Pro Men");
    });

    it("should return 404 for nonexistent division", async () => {
      const result = await rpcAsJudge("division.get", {
        divisionId: "d0000000-0000-4000-a000-000000000999",
      });
      expect(result.status).toBe(404);
    });
  });

  describe("createDivision", () => {
    it("should create division as admin", async () => {
      const result = await rpcAsAdmin("division.create", {
        contestId: TEST_CONTEST_ID,
        name: "Pro Women",
        category: "pro_women",
      });
      expect(result.status).toBe(200);
      expect((result.data as { category: string }).category).toBe("pro_women");
    });

    it("should return 403 for judge", async () => {
      const result = await rpcAsJudge("division.create", {
        contestId: TEST_CONTEST_ID,
        name: "Pro Women",
        category: "pro_women",
      });
      expect(result.status).toBe(403);
    });
  });

  describe("updateDivision", () => {
    it("should update division as admin", async () => {
      const result = await rpcAsAdmin("division.update", {
        divisionId: TEST_DIVISION_ID,
        data: { name: "Updated Division" },
      });
      expect(result.status).toBe(200);
      expect((result.data as { name: string }).name).toBe("Updated Division");
    });

    it("should return 403 for judge", async () => {
      const result = await rpcAsJudge("division.update", {
        divisionId: TEST_DIVISION_ID,
        data: { name: "Updated" },
      });
      expect(result.status).toBe(403);
    });
  });

  describe("deleteDivision", () => {
    it("should delete division as admin", async () => {
      const result = await rpcAsAdmin("division.delete", { divisionId: TEST_DIVISION_ID });
      expect(result.status).toBe(200);
    });

    it("should return 403 for judge", async () => {
      const result = await rpcAsJudge("division.delete", { divisionId: TEST_DIVISION_ID });
      expect(result.status).toBe(403);
    });
  });
});
```

**Step 3: Create riders tests**

```typescript
// __tests__/api/orpc/riders.test.ts
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "bun:test";
import { clearTestData, setupTestDb, teardownTestDb } from "../../test-db.js";
import {
  TEST_RIDER_1_ID,
  rpc,
  rpcAsAdmin,
  rpcAsJudge,
  seedTestHierarchy,
  seedTestUsers,
} from "./helpers.js";

describe("Rider oRPC Procedures", () => {
  beforeAll(async () => {
    await setupTestDb();
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  beforeEach(async () => {
    await clearTestData();
    await seedTestUsers();
    await seedTestHierarchy(); // seeds riders
  });

  describe("listRiders", () => {
    it("should list riders when authenticated", async () => {
      const result = await rpcAsJudge("rider.list", {});
      expect(result.status).toBe(200);
      expect((result.data as { riders: unknown[] }).riders.length).toBeGreaterThanOrEqual(2);
    });

    it("should return 401 without auth", async () => {
      const result = await rpc("rider.list", {});
      expect(result.status).toBe(401);
    });
  });

  describe("getRider", () => {
    it("should get rider by ID", async () => {
      const result = await rpcAsJudge("rider.get", { riderId: TEST_RIDER_1_ID });
      expect(result.status).toBe(200);
      expect((result.data as { firstName: string }).firstName).toBe("John");
    });

    it("should return 404 for nonexistent rider", async () => {
      const result = await rpcAsJudge("rider.get", {
        riderId: "d0000000-0000-4000-a000-000000000999",
      });
      expect(result.status).toBe(404);
    });
  });

  describe("createRider", () => {
    it("should create rider as admin", async () => {
      const result = await rpcAsAdmin("rider.create", {
        firstName: "Mike",
        lastName: "Johnson",
        country: "AUS",
      });
      expect(result.status).toBe(200);
      expect((result.data as { firstName: string }).firstName).toBe("Mike");
    });

    it("should return 403 for judge", async () => {
      const result = await rpcAsJudge("rider.create", {
        firstName: "Mike",
        lastName: "Johnson",
        country: "AUS",
      });
      expect(result.status).toBe(403);
    });
  });

  describe("updateRider", () => {
    it("should update rider as admin", async () => {
      const result = await rpcAsAdmin("rider.update", {
        riderId: TEST_RIDER_1_ID,
        data: { firstName: "Jonathan" },
      });
      expect(result.status).toBe(200);
      expect((result.data as { firstName: string }).firstName).toBe("Jonathan");
    });

    it("should return 403 for judge", async () => {
      const result = await rpcAsJudge("rider.update", {
        riderId: TEST_RIDER_1_ID,
        data: { firstName: "Jonathan" },
      });
      expect(result.status).toBe(403);
    });
  });

  describe("deleteRider", () => {
    it("should soft-delete rider as admin", async () => {
      const result = await rpcAsAdmin("rider.delete", { riderId: TEST_RIDER_1_ID });
      expect(result.status).toBe(200);
    });

    it("should return 403 for judge", async () => {
      const result = await rpcAsJudge("rider.delete", { riderId: TEST_RIDER_1_ID });
      expect(result.status).toBe(403);
    });
  });
});
```

**Step 4: Run all new tests**

Run: `bun test __tests__/api/orpc/contests.test.ts __tests__/api/orpc/divisions.test.ts __tests__/api/orpc/riders.test.ts`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add __tests__/api/orpc/contests.test.ts __tests__/api/orpc/divisions.test.ts __tests__/api/orpc/riders.test.ts
git commit -m "test: add oRPC CRUD tests for contests, divisions, and riders"
```

---

### Task 8: oRPC CRUD route tests — brackets, participants, auth

**Files:**
- Create: `__tests__/api/orpc/brackets.test.ts`
- Create: `__tests__/api/orpc/participants.test.ts`
- Create: `__tests__/api/orpc/auth.test.ts`

**Step 1: Create brackets tests**

```typescript
// __tests__/api/orpc/brackets.test.ts
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "bun:test";
import { clearTestData, setupTestDb, teardownTestDb } from "../../test-db.js";
import {
  TEST_BRACKET_ID,
  TEST_DIVISION_ID,
  rpc,
  rpcAsAdmin,
  rpcAsJudge,
  seedTestHeat,
  seedTestHierarchy,
  seedTestUsers,
} from "./helpers.js";

describe("Bracket oRPC Procedures", () => {
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
  });

  describe("listBrackets", () => {
    it("should list brackets by division", async () => {
      const result = await rpcAsJudge("bracket.list", { divisionId: TEST_DIVISION_ID });
      expect(result.status).toBe(200);
      expect((result.data as { brackets: unknown[] }).brackets).toHaveLength(1);
    });

    it("should return 401 without auth", async () => {
      const result = await rpc("bracket.list");
      expect(result.status).toBe(401);
    });
  });

  describe("getBracket", () => {
    it("should get bracket by ID", async () => {
      const result = await rpcAsJudge("bracket.get", { bracketId: TEST_BRACKET_ID });
      expect(result.status).toBe(200);
      expect((result.data as { name: string }).name).toBe("Main Bracket");
    });

    it("should return 404 for nonexistent bracket", async () => {
      const result = await rpcAsJudge("bracket.get", {
        bracketId: "d0000000-0000-4000-a000-000000000999",
      });
      expect(result.status).toBe(404);
    });
  });

  describe("getWithHeats", () => {
    it("should return bracket with heats", async () => {
      await seedTestHeat();
      const result = await rpcAsJudge("bracket.getWithHeats", { bracketId: TEST_BRACKET_ID });
      expect(result.status).toBe(200);
      const data = result.data as { bracket: unknown; rounds: unknown[] };
      expect(data.bracket).toBeDefined();
      expect(data.rounds).toBeDefined();
    });
  });

  describe("createBracket", () => {
    it("should create bracket as admin", async () => {
      const result = await rpcAsAdmin("bracket.create", {
        divisionId: TEST_DIVISION_ID,
        name: "Second Bracket",
        format: "single_elimination",
        status: "active",
      });
      expect(result.status).toBe(200);
    });

    it("should return 403 for judge", async () => {
      const result = await rpcAsJudge("bracket.create", {
        divisionId: TEST_DIVISION_ID,
        name: "Second Bracket",
        format: "single_elimination",
        status: "active",
      });
      expect(result.status).toBe(403);
    });
  });

  describe("updateBracket", () => {
    it("should update bracket as admin", async () => {
      const result = await rpcAsAdmin("bracket.update", {
        bracketId: TEST_BRACKET_ID,
        data: { name: "Updated Bracket" },
      });
      expect(result.status).toBe(200);
      expect((result.data as { name: string }).name).toBe("Updated Bracket");
    });
  });

  describe("deleteBracket", () => {
    it("should delete bracket as admin", async () => {
      const result = await rpcAsAdmin("bracket.delete", { bracketId: TEST_BRACKET_ID });
      expect(result.status).toBe(200);
    });

    it("should return 403 for judge", async () => {
      const result = await rpcAsJudge("bracket.delete", { bracketId: TEST_BRACKET_ID });
      expect(result.status).toBe(403);
    });
  });
});
```

**Step 2: Create participants tests**

```typescript
// __tests__/api/orpc/participants.test.ts
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "bun:test";
import { getDb } from "../../../src/infrastructure/db/index.js";
import { riders } from "../../../src/infrastructure/db/schema.js";
import { clearTestData, setupTestDb, teardownTestDb } from "../../test-db.js";
import {
  TEST_DIVISION_ID,
  TEST_RIDER_1_ID,
  TEST_RIDER_2_ID,
  rpc,
  rpcAsAdmin,
  rpcAsJudge,
  seedTestHierarchy,
  seedTestUsers,
} from "./helpers.js";

const EXTRA_RIDER_ID = "d0000000-0000-4000-a000-000000000d03";

describe("Participant oRPC Procedures", () => {
  beforeAll(async () => {
    await setupTestDb();
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  beforeEach(async () => {
    await clearTestData();
    await seedTestUsers();
    await seedTestHierarchy(); // seeds 2 riders + 2 participants
  });

  describe("listParticipants", () => {
    it("should list participants in division", async () => {
      const result = await rpcAsJudge("participant.list", { divisionId: TEST_DIVISION_ID });
      expect(result.status).toBe(200);
      expect((result.data as { riders: unknown[] }).riders).toHaveLength(2);
    });

    it("should return 401 without auth", async () => {
      const result = await rpc("participant.list", { divisionId: TEST_DIVISION_ID });
      expect(result.status).toBe(401);
    });
  });

  describe("addParticipant", () => {
    it("should add rider to division as admin", async () => {
      const db = await getDb();
      await db.insert(riders).values({
        id: EXTRA_RIDER_ID,
        firstName: "Extra",
        lastName: "Rider",
        country: "FRA",
      });

      const result = await rpcAsAdmin("participant.add", {
        divisionId: TEST_DIVISION_ID,
        riderId: EXTRA_RIDER_ID,
      });
      expect(result.status).toBe(200);
      expect((result.data as { riderId: string }).riderId).toBe(EXTRA_RIDER_ID);
    });

    it("should return 400 for duplicate participant", async () => {
      const result = await rpcAsAdmin("participant.add", {
        divisionId: TEST_DIVISION_ID,
        riderId: TEST_RIDER_1_ID,
      });
      expect(result.status).toBe(400);
    });

    it("should return 403 for judge", async () => {
      const result = await rpcAsJudge("participant.add", {
        divisionId: TEST_DIVISION_ID,
        riderId: EXTRA_RIDER_ID,
      });
      expect(result.status).toBe(403);
    });
  });

  describe("removeParticipant", () => {
    it("should remove participant as admin", async () => {
      const result = await rpcAsAdmin("participant.remove", {
        divisionId: TEST_DIVISION_ID,
        riderId: TEST_RIDER_1_ID,
      });
      expect(result.status).toBe(200);
    });

    it("should return 403 for judge", async () => {
      const result = await rpcAsJudge("participant.remove", {
        divisionId: TEST_DIVISION_ID,
        riderId: TEST_RIDER_1_ID,
      });
      expect(result.status).toBe(403);
    });
  });
});
```

**Step 3: Create auth tests**

```typescript
// __tests__/api/orpc/auth.test.ts
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "bun:test";
import { getDb } from "../../../src/infrastructure/db/index.js";
import { users } from "../../../src/infrastructure/db/schema.js";
import { hashPassword } from "../../../src/domain/user/user-service.js";
import { clearTestData, setupTestDb, teardownTestDb } from "../../test-db.js";
import { ADMIN_TOKEN, rpc, rpcAsAdmin, seedTestUsers } from "./helpers.js";

const LOGIN_USER_ID = "a0000000-0000-4000-a000-000000000a99";

describe("Auth oRPC Procedures", () => {
  beforeAll(async () => {
    await setupTestDb();
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  beforeEach(async () => {
    await clearTestData();
    await seedTestUsers();

    // Create a user with a known password for login tests
    const db = await getDb();
    const passwordHash = await hashPassword("testpassword");
    await db.insert(users).values({
      id: LOGIN_USER_ID,
      username: "loginuser",
      email: "login@test.com",
      passwordHash,
      role: "judge",
    });
  });

  describe("login", () => {
    it("should login with valid credentials", async () => {
      const result = await rpc("auth.login", {
        username: "loginuser",
        password: "testpassword",
      });

      expect(result.status).toBe(200);
      const data = result.data as { user: { username: string } };
      expect(data.user.username).toBe("loginuser");
    });

    it("should return 401 for invalid password", async () => {
      const result = await rpc("auth.login", {
        username: "loginuser",
        password: "wrongpassword",
      });

      expect(result.status).toBe(401);
    });

    it("should return 401 for nonexistent user", async () => {
      const result = await rpc("auth.login", {
        username: "nonexistent",
        password: "testpassword",
      });

      expect(result.status).toBe(401);
    });
  });

  describe("me", () => {
    it("should return current user when authenticated", async () => {
      const result = await rpcAsAdmin("auth.me");

      expect(result.status).toBe(200);
      const data = result.data as { user: { username: string } };
      expect(data.user.username).toBe("admin");
    });

    it("should return 401 when not authenticated", async () => {
      const result = await rpc("auth.me");

      expect(result.status).toBe(401);
    });
  });

  describe("logout", () => {
    it("should logout successfully", async () => {
      const result = await rpcAsAdmin("auth.logout");

      expect(result.status).toBe(200);
      expect((result.data as { message: string }).message).toBe("Logged out successfully");
    });

    it("should return 401 when not authenticated", async () => {
      const result = await rpc("auth.logout");

      expect(result.status).toBe(401);
    });
  });
});
```

**Step 4: Run all new tests**

Run: `bun test __tests__/api/orpc/brackets.test.ts __tests__/api/orpc/participants.test.ts __tests__/api/orpc/auth.test.ts`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add __tests__/api/orpc/brackets.test.ts __tests__/api/orpc/participants.test.ts __tests__/api/orpc/auth.test.ts
git commit -m "test: add oRPC tests for brackets, participants, and auth routes"
```

---

### Task 9: Run full test suite and verify

**Step 1: Run all tests**

Run: `bun run test:all`
Expected: All tests PASS (both backend and frontend)

**Step 2: Run quality checks**

Run: `bun format && bun check:fix && bun typecheck`
Expected: No errors

**Step 3: Commit any format fixes**

```bash
git add -A
git commit -m "chore: format fixes after Phase 1 test additions"
```

---

## Phase 2: Type Safety Improvements

### Task 10: Replace z.any() with proper schemas on heats routes

**Files:**
- Modify: `src/api/orpc/routes/heats.ts:297` (getViewer output)
- Modify: `src/api/orpc/routes/heats.ts:349` (getHeadJudge output)
- Reference: `src/domain/heat/viewer-state.ts` (HeatViewerState, RiderViewerData)

**Step 1: Define the viewer output schema**

Add these schemas near the top of `src/api/orpc/routes/heats.ts` (after the existing schema definitions):

```typescript
const riderViewerDataSchema = z.object({
  riderId: z.string(),
  position: z.number(),
  country: z.string(),
  sailNumber: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  waveTotal: z.number(),
  jumpTotal: z.number(),
  total: z.number(),
});

const heatViewerStateSchema = z.object({
  heatId: z.string(),
  position: z.string(),
  riders: z.array(riderViewerDataSchema),
});

const headJudgeScoreSchema = z.object({
  scoreUUID: z.string(),
  riderId: z.string(),
  type: z.enum(["wave", "jump"]),
  scoreValue: z.number(),
  jumpType: z.string().nullable(),
  modifiers: z.array(z.string()).nullable(),
  timestamp: z.date(),
  isCounting: z.boolean(),
});

const headJudgeJudgeSchema = z.object({
  judgeId: z.string(),
  judgeName: z.string(),
  scores: z.array(headJudgeScoreSchema),
  riderTotals: z.record(z.string(), z.number()),
});

const headJudgeRiderSchema = z.object({
  riderId: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  sailNumber: z.string(),
  country: z.string(),
});

const headJudgeViewSchema = z.object({
  heatId: z.string(),
  heatRules: z.object({
    wavesCounting: z.number(),
    jumpsCounting: z.number(),
  }),
  riders: z.array(headJudgeRiderSchema),
  judges: z.array(headJudgeJudgeSchema),
  averagedTotals: z.record(z.string(), z.number()),
  bracketId: z.string(),
  position: z.string(),
  roundNumber: z.number(),
  roundName: z.string(),
  completedAt: z.date().nullable(),
});
```

**Step 2: Replace z.any() with the new schemas**

In the `getViewer` procedure, change `.output(z.any())` to `.output(heatViewerStateSchema)`.

In the `getHeadJudge` procedure, change `.output(z.any())` to `.output(headJudgeViewSchema)`.

**Step 3: Run typecheck and tests**

Run: `bun typecheck && bun test __tests__/api/orpc/heats.test.ts`
Expected: No type errors, all tests PASS

**Step 4: Commit**

```bash
git add src/api/orpc/routes/heats.ts
git commit -m "fix: replace z.any() with typed Zod schemas for viewer and head judge endpoints"
```

---

### Task 11: Replace generic Error with custom domain errors in HeatService

**Files:**
- Modify: `src/domain/heat/heat-service.ts`
- Modify: `src/domain/heat/errors.ts`

**Step 1: Add missing error types**

Add to `src/domain/heat/errors.ts`:

```typescript
export class ScoreNotFoundError extends Error {
  constructor(scoreUuid: string) {
    super(`Score ${scoreUuid} not found`);
  }
}

export class ScoreTypeMismatchError extends Error {
  constructor(scoreUuid: string, expectedType: string, actualType: string) {
    super(`Score ${scoreUuid} is type "${actualType}", expected "${expectedType}"`);
  }
}
```

Also add them to the `BadUserRequestError` union type.

**Step 2: Replace generic errors in heat-service.ts**

In `updateWaveScore`:
- Replace `throw new Error(\`Score ${scoreUuid} not found\`)` with `throw new ScoreNotFoundError(scoreUuid)`
- Replace `throw new Error(\`Score ${scoreUuid} is not a wave score\`)` with `throw new ScoreTypeMismatchError(scoreUuid, "wave", existingScore.type)`

In `updateJumpScore`:
- Same replacements for jump scores

In `deleteScore`:
- Replace `throw new Error(\`Score ${scoreUuid} not found\`)` with `throw new ScoreNotFoundError(scoreUuid)`

**Step 3: Update heat-service tests to use new error types**

In `__tests__/domain/heat/heat-service.test.ts`, import the new error types and update the test assertions:
- `rejects.toThrow("not found")` → `rejects.toBeInstanceOf(ScoreNotFoundError)`
- `rejects.toThrow("not a wave score")` → `rejects.toBeInstanceOf(ScoreTypeMismatchError)`
- `rejects.toThrow("not a jump score")` → `rejects.toBeInstanceOf(ScoreTypeMismatchError)`

**Step 4: Run tests**

Run: `bun test __tests__/domain/heat/heat-service.test.ts && bun typecheck`
Expected: All tests PASS, no type errors

**Step 5: Commit**

```bash
git add src/domain/heat/errors.ts src/domain/heat/heat-service.ts __tests__/domain/heat/heat-service.test.ts
git commit -m "fix: replace generic Error with ScoreNotFoundError and ScoreTypeMismatchError"
```

---

### Task 12: Run full quality checks

**Step 1: Run all checks**

Run: `bun run test:all && bun format && bun check:fix && bun typecheck`
Expected: All pass

**Step 2: Commit any format fixes**

```bash
git add -A
git commit -m "chore: format and lint fixes after Phase 2 type safety improvements"
```

---

## Phase 3: Dead Code Cleanup

### Task 13: Delete unused old HTTP route files

Based on the dead code analysis:
- `src/api/routes/contest-routes.ts` — not imported anywhere (only mentioned in docs)
- `src/api/routes/rider-routes.ts` — not imported anywhere (only mentioned in docs)

**Files:**
- Delete: `src/api/routes/contest-routes.ts`
- Delete: `src/api/routes/rider-routes.ts`

**Step 1: Verify no imports exist**

Run a grep for these files across the codebase (excluding docs/) to confirm they're truly unused.

Search for: `contest-routes` and `rider-routes` in `.ts` and `.tsx` files.

Expected: No imports found (only docs/tmp.md references)

**Step 2: Delete the files**

```bash
git rm src/api/routes/contest-routes.ts src/api/routes/rider-routes.ts
```

**Step 3: Run tests to verify nothing breaks**

Run: `bun run test:all && bun typecheck`
Expected: All pass

**Step 4: Commit**

```bash
git commit -m "chore: delete unused old HTTP route files (contest-routes, rider-routes)"
```

---

### Task 14: Audit remaining old HTTP routes for future cleanup

The remaining old files (`auth.ts`, `heat-routes.ts`, `bracket-routes.ts`, `head-judge-routes.ts`) are NOT mounted in server.ts but ARE imported by existing tests. These tests validate the same logic that the new oRPC tests from Phase 1 now cover.

**This task is informational — do NOT delete these yet.**

The old route files and their tests should be deleted in a future cleanup once you've verified the new oRPC tests provide equivalent coverage. The old test files to eventually migrate:
- `__tests__/api/auth.test.ts` → covered by `__tests__/api/orpc/auth.test.ts`
- `__tests__/api/heat-routes.test.ts` → covered by `__tests__/api/orpc/heats.test.ts` + `scores.test.ts`
- `__tests__/api/bracket-routes.test.ts` → covered by `__tests__/api/orpc/brackets.test.ts`
- `__tests__/api/routes/head-judge-routes.test.ts` → covered by `__tests__/api/orpc/heats.test.ts`
- `__tests__/api/auth-protected-routes.test.ts` → auth coverage spread across all oRPC tests
- `__tests__/api/integration.test.ts` → WebSocket broadcasting (keep, still relevant)

**Files to eventually delete (NOT now):**
- `src/api/routes/auth.ts`
- `src/api/routes/heat-routes.ts`
- `src/api/routes/bracket-routes.ts`
- `src/api/routes/head-judge-routes.ts`
- `src/api/helpers.ts`
- `src/api/middleware/auth.ts`
- `src/api/middleware/error-handling.ts`
- `src/api/middleware/validation.ts`

**Files to KEEP:**
- `src/api/websocket.ts` — actively mounted in server.ts
- `src/api/websocket-head-judge.ts` — actively mounted in server.ts
- `src/api/schemas.ts` — used by both old and new routes
- `src/api/types.ts` — used by websocket files

**Step 1: No action needed — this is documentation only**

**Step 2: Commit the plan as documentation**

No commit needed.

---

### Task 15: Final verification

**Step 1: Run complete quality suite**

```bash
bun run test:all && bun format && bun check:fix && bun typecheck
```

Expected: All pass with zero errors

**Step 2: Review test count improvement**

Before: ~277 tests
After: ~277 + new tests from Tasks 1-8

New tests added:
- heat-service.test.ts: ~20 tests
- score-calculator-repo.test.ts: ~9 tests
- scores.test.ts: ~12 tests
- heats.test.ts: ~14 tests
- contests.test.ts: ~8 tests
- divisions.test.ts: ~8 tests
- riders.test.ts: ~8 tests
- brackets.test.ts: ~8 tests
- participants.test.ts: ~6 tests
- auth.test.ts: ~6 tests

Estimated new total: ~377 tests (~36% increase)

Coverage improvements:
- Domain layer: 25% → ~50% (heat-service now tested)
- API layer: 32% → ~75% (all oRPC routes tested)
- Type safety: 2 `z.any()` → 0, inconsistent errors → consistent custom errors
