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
      expect(result.data.contests).toHaveLength(1);
      expect(result.data.contests[0].name).toBe("Test Contest");
    });

    it("should list all contests without seasonId filter", async () => {
      const result = await rpcAsJudge("contest.list", {});
      expect(result.status).toBe(200);
      expect(result.data.contests).toHaveLength(1);
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
      expect(result.data.name).toBe("Test Contest");
      expect(result.data.location).toBe("Test Beach");
      expect(result.data.status).toBe("scheduled");
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
      expect(result.data.name).toBe("New Contest");
      expect(result.data.location).toBe("Beach");
      expect(result.data.status).toBe("draft");
      expect(result.data.id).toBeDefined();
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
      expect(result.data.name).toBe("Updated Contest");
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
      expect(result.data.message).toBe("Contest deleted successfully");
    });

    it("should return 403 for judge", async () => {
      const result = await rpcAsJudge("contest.delete", { contestId: TEST_CONTEST_ID });
      expect(result.status).toBe(403);
    });
  });
});
