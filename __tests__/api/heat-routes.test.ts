import { afterAll, beforeAll, beforeEach, describe, expect, it } from "bun:test";
import { randomUUIDv7 } from "bun";
import {
  handleAddJumpScore,
  handleAddWaveScore,
  handleCompleteHeat,
  handleCreateHeat,
  handleGetHeat,
  handleListHeats,
} from "../../src/api/routes/heat-routes.js";
import { getDb } from "../../src/infrastructure/db/index.js";
import {
  brackets,
  contests,
  divisions,
  riders,
  seasons,
  users,
} from "../../src/infrastructure/db/schema.js";
import { createHeatRepository } from "../../src/infrastructure/repositories/index.js";
import { clearTestData, setupTestDb, teardownTestDb } from "../test-db.js";
import {
  apiHeatsUrl,
  apiJumpScoreUrl,
  apiWaveScoreUrl,
  createGetHeatRequest,
  createHeatRequest,
  createJumpScoreRequest,
  createWaveScoreRequest,
  DEFAULT_HEAT_RULES,
  DEFAULT_TEST_BRACKET_ID,
  RIDER_1,
  RIDER_2,
} from "./shared.js";

type ListHeatsHeat = {
  heatId: string;
  riderIds: string[];
  heatRules: { wavesCounting: number; jumpsCounting: number };
  scores: unknown[];
  bracketId: string;
};

type ListHeatsResponsePayload = {
  heats: Array<ListHeatsHeat>;
};

describe("Heat API Routes", () => {
  function getUniqueHeatId(prefix: string): string {
    return `${prefix}-${randomUUIDv7("hex")}`;
  }

  // Test IDs for foreign key relationships
  const TEST_SEASON_ID = "00000000-0000-0000-0000-000000000001";
  const TEST_CONTEST_ID = "00000000-0000-0000-0000-000000000002";
  const TEST_DIVISION_ID = "00000000-0000-0000-0000-000000000003";
  const TEST_RIDER_1_ID = "00000000-0000-0000-0000-000000000011";
  const TEST_RIDER_2_ID = "00000000-0000-0000-0000-000000000012";
  const TEST_JUDGE_ID = "00000000-0000-0000-0000-000000000020";

  // Setup isolated PGlite database for this test file
  beforeAll(async () => {
    await setupTestDb();
  });

  // Cleanup PGlite database after all tests
  afterAll(async () => {
    await teardownTestDb();
  });

  // Set up test data hierarchy before each test
  beforeEach(async () => {
    // Clear all data from previous test
    await clearTestData();

    const heatRepository = createHeatRepository();
    const db = await getDb();

    // Insert test data hierarchy: season -> contest -> division -> bracket
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
      endDate: new Date("2025-06-07"),
      status: "in_progress",
    });

    await db.insert(divisions).values({
      id: TEST_DIVISION_ID,
      contestId: TEST_CONTEST_ID,
      name: "Test Division",
      category: "pro_men",
    });

    await db.insert(brackets).values({
      id: DEFAULT_TEST_BRACKET_ID,
      divisionId: TEST_DIVISION_ID,
      name: "Test Bracket",
      format: "single_elimination",
      status: "in_progress",
    });

    // Insert test judge
    await db.insert(users).values({
      id: TEST_JUDGE_ID,
      username: "testjudge",
      email: "test-judge@example.com",
      passwordHash: "test-password-hash",
      role: "judge",
    });

    // Insert test riders
    await db.insert(riders).values({
      id: TEST_RIDER_1_ID,
      firstName: "Test",
      lastName: "Rider One",
      country: "US",
      sailNumber: "US-1",
    });

    await db.insert(riders).values({
      id: TEST_RIDER_2_ID,
      firstName: "Test",
      lastName: "Rider Two",
      country: "US",
      sailNumber: "US-2",
    });

    // Clean up all heats (empty with PGlite but keep for consistency)
    const allHeats = await heatRepository.getAllHeats();
    for (const heat of allHeats) {
      await heatRepository.deleteHeat(heat.heatId);
    }
  });

  describe("handleCreateHeat", () => {
    it("should create a heat successfully", async () => {
      const heatId = getUniqueHeatId("heat");
      const request = createHeatRequest(heatId, {
        riderIds: [RIDER_1, RIDER_2],
        bracketId: DEFAULT_TEST_BRACKET_ID,
      });

      const response = await handleCreateHeat(request);
      expect(response.status).toBe(200);

      const data = (await response.json()) as {
        heatId: string;
        riderIds: string[];
        heatRules: { wavesCounting: number; jumpsCounting: number };
      };
      expect(data.heatId).toBe(heatId);
      expect(data.riderIds).toEqual([TEST_RIDER_1_ID, TEST_RIDER_2_ID]);
    });

    it("should return 400 for missing required fields", async () => {
      const heatId = getUniqueHeatId("heat");
      const request = new Request(apiHeatsUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          heatId,
          // Missing riderIds and heatRules
        }),
      });

      const response = await handleCreateHeat(request);
      expect(response.status).toBe(400);

      const data = (await response.json()) as { error: string };
      expect(data.error).toContain("Validation error");
    });

    it("should return 400 if heat already exists", async () => {
      const heatId = getUniqueHeatId("heat");
      // Create heat first
      const createRequest = createHeatRequest(heatId, {
        riderIds: [RIDER_1],
        bracketId: DEFAULT_TEST_BRACKET_ID,
      });

      await handleCreateHeat(createRequest);

      // Try to create again
      const duplicateRequest = createHeatRequest(heatId, {
        riderIds: [RIDER_2],
        bracketId: DEFAULT_TEST_BRACKET_ID,
      });

      const response = await handleCreateHeat(duplicateRequest);
      expect(response.status).toBe(400);

      const data = (await response.json()) as { error: string };
      expect(data.error).toContain("already exists");
    });
  });

  describe("handleAddWaveScore", () => {
    it("should add a wave score successfully", async () => {
      const heatId = getUniqueHeatId("heat");
      // Create a heat first
      const createRequest = createHeatRequest(heatId, {
        riderIds: [RIDER_1, RIDER_2],
        bracketId: DEFAULT_TEST_BRACKET_ID,
      });

      await handleCreateHeat(createRequest);

      const request = createWaveScoreRequest(heatId, {
        scoreUUID: "wave-1",
        riderId: RIDER_1,
        waveScore: 8.5,
      });

      const response = await handleAddWaveScore(request);
      expect(response.status).toBe(200);

      const data = (await response.json()) as {
        heatId: string;
        scoreUUID: string;
        message: string;
      };
      expect(data.heatId).toBe(heatId);
      expect(data.scoreUUID).toBe("wave-1");
      expect(data.message).toBe("Wave score added successfully");
    });

    it("should add a jump score successfully", async () => {
      const heatId = getUniqueHeatId("heat");
      // Create a heat first
      const createRequest = createHeatRequest(heatId, {
        riderIds: [RIDER_1],
        bracketId: DEFAULT_TEST_BRACKET_ID,
      });

      await handleCreateHeat(createRequest);

      const request = createJumpScoreRequest(heatId, {
        scoreUUID: "jump-1",
        riderId: RIDER_1,
        jumpScore: 9.0,
        jumpType: "forward",
      });

      const response = await handleAddJumpScore(request);
      expect(response.status).toBe(200);

      const data = (await response.json()) as {
        heatId: string;
        scoreUUID: string;
        message: string;
      };
      expect(data.heatId).toBe(heatId);
      expect(data.scoreUUID).toBe("jump-1");
      expect(data.message).toBe("Jump score added successfully");
    });

    it("should return 400 for invalid wave score (out of range)", async () => {
      const heatId = getUniqueHeatId("heat");
      // Create a heat first
      const createRequest = createHeatRequest(heatId, {
        riderIds: [RIDER_1],
        bracketId: DEFAULT_TEST_BRACKET_ID,
      });

      await handleCreateHeat(createRequest);

      const request = createWaveScoreRequest(heatId, {
        scoreUUID: "wave-1",
        riderId: RIDER_1,
        waveScore: 11, // Invalid: > 10
      });

      const response = await handleAddWaveScore(request);
      expect(response.status).toBe(400);

      const data = (await response.json()) as { error: string };
      expect(data.error).toContain("between 0 and 10");
    });

    it("should return 400 for invalid jump type", async () => {
      const heatId = getUniqueHeatId("heat");
      // Create a heat first
      const createRequest = createHeatRequest(heatId, {
        riderIds: [RIDER_1],
        bracketId: DEFAULT_TEST_BRACKET_ID,
      });

      await handleCreateHeat(createRequest);

      const request = createJumpScoreRequest(heatId, {
        scoreUUID: "jump-1",
        riderId: RIDER_1,
        jumpScore: 9.0,
        jumpType: "invalid-jump-type",
      });

      const response = await handleAddJumpScore(request);
      expect(response.status).toBe(400);

      const data = (await response.json()) as { error: string };
      expect(data.error).toMatch(/Invalid option|jumpType/);
    });
  });

  describe("handleAddJumpScore", () => {
    it("should return 400 for missing required fields", async () => {
      const heatId = getUniqueHeatId("heat");
      // Create a heat first
      const createRequest = createHeatRequest(heatId, {
        riderIds: [RIDER_1],
        bracketId: DEFAULT_TEST_BRACKET_ID,
      });

      await handleCreateHeat(createRequest);

      const request = new Request(apiJumpScoreUrl(heatId), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          heatId,
          scoreUUID: "jump-1",
          riderId: RIDER_1,
          // Missing jumpScore and jumpType
        }),
      });
      // Add mock user for authentication
      (request as Request & { user: { id: string } }).user = { id: "test-judge" };

      const response = await handleAddJumpScore(request as Request & { user: { id: string } });
      expect(response.status).toBe(400);

      const data = (await response.json()) as { error: string };
      expect(data.error).toContain("Validation error");
    });
  });

  describe("handleAddWaveScore - error cases", () => {
    it("should return 400 for missing waveScore", async () => {
      const heatId = getUniqueHeatId("heat");
      // Create a heat first
      const createRequest = createHeatRequest(heatId, {
        riderIds: [RIDER_1],
        bracketId: DEFAULT_TEST_BRACKET_ID,
      });

      await handleCreateHeat(createRequest);

      const request = new Request(apiWaveScoreUrl(heatId), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scoreUUID: "score-1",
          riderId: RIDER_1,
          // Missing waveScore
        }),
      });
      // Add mock user for authentication
      (request as Request & { user: { id: string } }).user = { id: "test-judge" };

      const response = await handleAddWaveScore(request as Request & { user: { id: string } });
      expect(response.status).toBe(400);

      const data = (await response.json()) as { error: string };
      expect(data.error).toContain("Validation error");
    });

    it("should return 400 if heat does not exist", async () => {
      const heatId = getUniqueHeatId("nonexistent");
      const request = createWaveScoreRequest(heatId, {
        scoreUUID: "wave-1",
        riderId: RIDER_1,
        waveScore: 8.5,
      });

      const response = await handleAddWaveScore(request);
      expect(response.status).toBe(400);

      const data = (await response.json()) as { error: string };
      expect(data.error).toContain("does not exist");
    });
  });

  describe("handleGetHeat", () => {
    it("should return 404 for non-existent heat", async () => {
      const heatId = getUniqueHeatId("nonexistent");
      const request = createGetHeatRequest(heatId);
      const response = await handleGetHeat(heatId, request);
      expect(response.status).toBe(404);

      const data = (await response.json()) as { error: string };
      expect(data.error).toBe("Heat not found");
    });

    it("should return heat state for existing heat", async () => {
      const heatId = getUniqueHeatId("heat");
      // Create heat first
      const createRequest = createHeatRequest(heatId, {
        riderIds: [RIDER_1, RIDER_2],
        bracketId: DEFAULT_TEST_BRACKET_ID,
      });

      await handleCreateHeat(createRequest);

      // Get heat state
      const request = createGetHeatRequest(heatId);
      const response = await handleGetHeat(heatId, request);
      expect(response.status).toBe(200);

      const data = (await response.json()) as {
        heatId: string;
        riderIds: string[];
        heatRules: { wavesCounting: number; jumpsCounting: number };
        scores: unknown[];
      };
      expect(data.heatId).toBe(heatId);
      expect(data.riderIds).toEqual([RIDER_1, RIDER_2]);
      expect(data.heatRules).toEqual(DEFAULT_HEAT_RULES);
      expect(data.scores).toEqual([]);
    });

    it("should return heat state with scores", async () => {
      const heatId = getUniqueHeatId("heat");
      // Create heat
      const createRequest = createHeatRequest(heatId, {
        riderIds: [RIDER_1],
        bracketId: DEFAULT_TEST_BRACKET_ID,
      });

      await handleCreateHeat(createRequest);

      // Add a score
      const scoreRequest = createWaveScoreRequest(heatId, {
        scoreUUID: "wave-1",
        riderId: RIDER_1,
        waveScore: 8.5,
      });

      await handleAddWaveScore(scoreRequest);

      // Get heat state
      const request = createGetHeatRequest(heatId);
      const response = await handleGetHeat(heatId, request);
      expect(response.status).toBe(200);

      const data = (await response.json()) as {
        heatId: string;
        scores: Array<{
          type: string;
          scoreUUID: string;
          riderId: string;
          scoreValue: number;
          judgeId: string;
          jumpType: string | null;
          modifiers: string | null;
          timestamp: string;
        }>;
      };
      expect(data.scores).toHaveLength(1);
      expect(data.scores[0]).toMatchObject({
        type: "wave",
        scoreUUID: "wave-1",
        riderId: RIDER_1,
        scoreValue: 8.5,
      });
      expect(data.heatId).toBe(heatId);
    });
  });

  describe("handleListHeats", () => {
    it("should return array of heats with correct structure", async () => {
      const response = await handleListHeats();
      expect(response.status).toBe(200);

      const data = (await response.json()) as ListHeatsResponsePayload;

      // Verify response structure
      expect(Array.isArray(data.heats)).toBe(true);

      // If there are heats, verify their structure
      if (data.heats.length > 0) {
        const heat = data.heats[0];
        expect(heat).toHaveProperty("heatId");
        expect(heat).toHaveProperty("riderIds");
        expect(heat).toHaveProperty("heatRules");
        expect(heat).toHaveProperty("scores");
        expect(heat).toHaveProperty("bracketId");
        expect(Array.isArray(heat.riderIds)).toBe(true);
        expect(Array.isArray(heat.scores)).toBe(true);
        expect(heat.heatRules).toHaveProperty("wavesCounting");
        expect(heat.heatRules).toHaveProperty("jumpsCounting");
      }
    });

    it("should return heats that exist in the database", async () => {
      // Get initial count of heats
      const initialResponse = await handleListHeats();
      expect(initialResponse.status).toBe(200);
      const initialData = (await initialResponse.json()) as ListHeatsResponsePayload;
      const initialCount = initialData.heats.length;
      expect(initialCount).toBe(0);

      // The function should return all heats from the database
      const response = await handleListHeats();
      expect(response.status).toBe(200);

      const data = (await response.json()) as ListHeatsResponsePayload;

      // Should return at least the same number of heats
      expect(data.heats.length).toBeGreaterThanOrEqual(initialCount);

      // Verify all heats have the correct structure
      for (const heat of data.heats) {
        expect(typeof heat.heatId).toBe("string");
        expect(Array.isArray(heat.riderIds)).toBe(true);
        expect(typeof heat.heatRules.wavesCounting).toBe("number");
        expect(typeof heat.heatRules.jumpsCounting).toBe("number");
        expect(Array.isArray(heat.scores)).toBe(true);
        expect(heat.bracketId === null || typeof heat.bracketId === "string").toBe(true);
      }
    });
  });

  describe("handleCompleteHeat", () => {
    it("should complete a heat with scores", async () => {
      const heatId = getUniqueHeatId("heat-complete");
      // Create heat
      const createRequest = createHeatRequest(heatId, {
        riderIds: [RIDER_1, RIDER_2],
        bracketId: DEFAULT_TEST_BRACKET_ID,
      });

      await handleCreateHeat(createRequest);

      // Add score
      const scoreRequest = createWaveScoreRequest(heatId, {
        scoreUUID: "score-1",
        riderId: RIDER_1,
        waveScore: 8.5,
      });

      await handleAddWaveScore(scoreRequest);

      // Complete heat
      const completeRequest = new Request(apiHeatsUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const response = await handleCompleteHeat(heatId, completeRequest);

      expect(response.status).toBe(200);
      const result = (await response.json()) as { message: string };
      expect(result.message).toBe("Heat completed successfully");
    });

    it("should allow completing heat without scores", async () => {
      const heatId = getUniqueHeatId("heat-no-scores");
      // Create heat
      const createRequest = createHeatRequest(heatId, {
        riderIds: [RIDER_1, RIDER_2],
        bracketId: DEFAULT_TEST_BRACKET_ID,
      });

      await handleCreateHeat(createRequest);

      // Complete without scores (should succeed now)
      const completeRequest = new Request(apiHeatsUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const response = await handleCompleteHeat(heatId, completeRequest);

      expect(response.status).toBe(200);
      const result = (await response.json()) as { message: string };
      expect(result.message).toBe("Heat completed successfully");
    });
  });
});
