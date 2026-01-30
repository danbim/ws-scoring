import { afterAll, beforeAll, beforeEach, describe, expect, it } from "bun:test";
import { clearTestData, setupTestDb, teardownTestDb } from "../../test-db.js";
import {
  rpcAsJudge,
  seedTestHeat,
  seedTestHierarchy,
  seedTestUsers,
  TEST_HEAT_ID,
  TEST_RIDER_1_ID,
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
