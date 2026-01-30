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
    await seedTestHierarchy();
  });

  describe("listRiders", () => {
    it("should list riders when authenticated", async () => {
      const result = await rpcAsJudge("rider.list", {});
      expect(result.status).toBe(200);
      expect(result.data.riders).toHaveLength(2);
    });

    it("should return 401 without auth", async () => {
      const result = await rpc("rider.list");
      expect(result.status).toBe(401);
    });
  });

  describe("getRider", () => {
    it("should get rider by ID", async () => {
      const result = await rpcAsJudge("rider.get", { riderId: TEST_RIDER_1_ID });
      expect(result.status).toBe(200);
      expect(result.data.firstName).toBe("Rider");
      expect(result.data.lastName).toBe("One");
      expect(result.data.country).toBe("US");
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
      expect(result.data.firstName).toBe("Mike");
      expect(result.data.lastName).toBe("Johnson");
      expect(result.data.country).toBe("AUS");
      expect(result.data.id).toBeDefined();
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
      expect(result.data.firstName).toBe("Jonathan");
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
      expect(result.data.message).toBe("Rider deleted successfully");
    });

    it("should return 403 for judge", async () => {
      const result = await rpcAsJudge("rider.delete", { riderId: TEST_RIDER_1_ID });
      expect(result.status).toBe(403);
    });
  });
});
