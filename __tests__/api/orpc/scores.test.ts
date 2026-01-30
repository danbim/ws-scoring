// __tests__/api/orpc/scores.test.ts
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "bun:test";
import { clearTestData, setupTestDb, teardownTestDb } from "../../test-db.js";
import {
  rpc,
  rpcAsAdmin,
  rpcAsHeadJudge,
  rpcAsJudge,
  seedTestHeat,
  seedTestHierarchy,
  seedTestUsers,
  TEST_HEAT_ID,
  TEST_RIDER_1_ID,
  TEST_RIDER_2_ID,
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
