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
    await seedTestHierarchy();
  });

  describe("listParticipants", () => {
    it("should list participants in division", async () => {
      const result = await rpcAsJudge("participant.list", { divisionId: TEST_DIVISION_ID });
      expect(result.status).toBe(200);
      expect(result.data.riders).toHaveLength(2);
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
      expect(result.data.divisionId).toBe(TEST_DIVISION_ID);
      expect(result.data.riderId).toBe(EXTRA_RIDER_ID);
      expect(result.data.id).toBeDefined();
      expect(result.data.createdAt).toBeDefined();
    });

    it("should return 400 for duplicate participant", async () => {
      const result = await rpcAsAdmin("participant.add", {
        divisionId: TEST_DIVISION_ID,
        riderId: TEST_RIDER_1_ID,
      });
      expect(result.status).toBe(400);
    });

    it("should return 403 for judge", async () => {
      const db = await getDb();
      await db.insert(riders).values({
        id: EXTRA_RIDER_ID,
        firstName: "Extra",
        lastName: "Rider",
        country: "FRA",
      });

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
      expect(result.data.message).toBe("Participant removed successfully");
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
