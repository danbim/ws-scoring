// __tests__/api/orpc/heats.test.ts
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "bun:test";
import { clearTestData, setupTestDb, teardownTestDb } from "../../test-db.js";
import {
  rpc,
  rpcAsAdmin,
  rpcAsJudge,
  seedTestHeat,
  seedTestHierarchy,
  seedTestUsers,
  TEST_BRACKET_ID,
  TEST_HEAT_ID,
  TEST_RIDER_1_ID,
  TEST_RIDER_2_ID,
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
