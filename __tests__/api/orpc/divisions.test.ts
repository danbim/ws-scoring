import { afterAll, beforeAll, beforeEach, describe, expect, it } from "bun:test";
import { clearTestData, setupTestDb, teardownTestDb } from "../../test-db.js";
import {
  rpc,
  rpcAsAdmin,
  rpcAsJudge,
  seedTestHierarchy,
  seedTestUsers,
  TEST_CONTEST_ID,
  TEST_DIVISION_ID,
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
      expect(result.data.divisions).toHaveLength(1);
      expect(result.data.divisions[0].name).toBe("Pro Men");
    });

    it("should list all divisions without contestId filter", async () => {
      const result = await rpcAsJudge("division.list", {});
      expect(result.status).toBe(200);
      expect(result.data.divisions).toHaveLength(1);
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
      expect(result.data.name).toBe("Pro Men");
      expect(result.data.category).toBe("pro_men");
      expect(result.data.contestId).toBe(TEST_CONTEST_ID);
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
      expect(result.data.name).toBe("Pro Women");
      expect(result.data.category).toBe("pro_women");
      expect(result.data.contestId).toBe(TEST_CONTEST_ID);
      expect(result.data.id).toBeDefined();
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
      expect(result.data.name).toBe("Updated Division");
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
      expect(result.data.message).toBe("Division deleted successfully");
    });

    it("should return 403 for judge", async () => {
      const result = await rpcAsJudge("division.delete", { divisionId: TEST_DIVISION_ID });
      expect(result.status).toBe(403);
    });
  });
});
