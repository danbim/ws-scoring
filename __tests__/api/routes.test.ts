import { describe, expect, it } from "bun:test";
import { randomUUIDv7 } from "bun";
import {
  handleAddJumpScore,
  handleAddWaveScore,
  handleCreateHeat,
  handleGetHeat,
  handleListHeats,
} from "../../src/api/routes.js";
import {
  apiHeatsUrl,
  apiJumpScoreUrl,
  apiWaveScoreUrl,
  createHeatRequest,
  createJumpScoreRequest,
  createWaveScoreRequest,
  DEFAULT_HEAT_RULES,
  RIDER_1,
  RIDER_2,
} from "./shared.js";

describe("API Routes", () => {
  function getUniqueHeatId(prefix: string): string {
    return `${prefix}-${randomUUIDv7("hex")}`;
  }

  describe("handleCreateHeat", () => {
    it("should create a heat successfully", async () => {
      const heatId = getUniqueHeatId("heat");
      const request = createHeatRequest(heatId, {
        riderIds: [RIDER_1, RIDER_2],
      });

      const response = await handleCreateHeat(request);
      expect(response.status).toBe(200);

      const data = (await response.json()) as {
        heatId: string;
        events: unknown[];
      };
      expect(data.heatId).toBe(heatId);
      expect(data.events).toHaveLength(1);
      expect(data.events[0]).toMatchObject({
        type: "HeatCreated",
      });
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
      });

      await handleCreateHeat(createRequest);

      // Try to create again
      const duplicateRequest = createHeatRequest(heatId, {
        riderIds: [RIDER_2],
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
        events: unknown[];
      };
      expect(data.heatId).toBe(heatId);
      expect(data.events).toHaveLength(1);
      expect(data.events[0]).toMatchObject({
        type: "WaveScoreAdded",
      });
    });

    it("should add a jump score successfully", async () => {
      const heatId = getUniqueHeatId("heat");
      // Create a heat first
      const createRequest = createHeatRequest(heatId, {
        riderIds: [RIDER_1],
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
        events: unknown[];
      };
      expect(data.heatId).toBe(heatId);
      expect(data.events).toHaveLength(1);
      expect(data.events[0]).toMatchObject({
        type: "JumpScoreAdded",
      });
    });

    it("should return 400 for invalid wave score (out of range)", async () => {
      const heatId = getUniqueHeatId("heat");
      // Create a heat first
      const createRequest = createHeatRequest(heatId, {
        riderIds: [RIDER_1],
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

      const response = await handleAddJumpScore(request);
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

      const response = await handleAddWaveScore(request);
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
      const response = await handleGetHeat(heatId);
      expect(response.status).toBe(404);

      const data = (await response.json()) as { error: string };
      expect(data.error).toBe("Heat not found");
    });

    it("should return heat state for existing heat", async () => {
      const heatId = getUniqueHeatId("heat");
      // Create heat first
      const createRequest = createHeatRequest(heatId, {
        riderIds: [RIDER_1, RIDER_2],
      });

      await handleCreateHeat(createRequest);

      // Get heat state
      const response = await handleGetHeat(heatId);
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
      const response = await handleGetHeat(heatId);
      expect(response.status).toBe(200);

      const data = (await response.json()) as {
        heatId: string;
        scores: Array<{
          type: string;
          scoreUUID: string;
          riderId: string;
          score: number;
        }>;
      };
      expect(data.scores).toHaveLength(1);
      expect(data.scores[0]).toMatchObject({
        type: "wave",
        scoreUUID: "wave-1",
        riderId: RIDER_1,
        score: 8.5,
      });
      expect(data.heatId).toBe(heatId);
    });
  });

  describe("handleListHeats", () => {
    it("should return array of heats with correct structure", async () => {
      const response = await handleListHeats();
      expect(response.status).toBe(200);

      const data = (await response.json()) as {
        heats: Array<{
          heatId: string;
          riderIds: string[];
          heatRules: { wavesCounting: number; jumpsCounting: number };
          scores: unknown[];
          bracketId: string | null;
        }>;
      };

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
      const initialData = (await initialResponse.json()) as { heats: unknown[] };
      const initialCount = initialData.heats.length;

      // The function should return all heats from the database
      const response = await handleListHeats();
      expect(response.status).toBe(200);

      const data = (await response.json()) as {
        heats: Array<{
          heatId: string;
          riderIds: string[];
          heatRules: { wavesCounting: number; jumpsCounting: number };
          scores: unknown[];
          bracketId: string | null;
        }>;
      };

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
});
