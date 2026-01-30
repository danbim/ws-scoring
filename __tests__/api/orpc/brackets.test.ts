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
      expect(result.data.brackets).toHaveLength(1);
      expect(result.data.brackets[0].name).toBe("Main Bracket");
    });

    it("should list all brackets without filter", async () => {
      const result = await rpcAsAdmin("bracket.list", {});
      expect(result.status).toBe(200);
      expect(result.data.brackets).toHaveLength(1);
    });

    it("should return 401 without auth", async () => {
      const result = await rpc("bracket.list", {});
      expect(result.status).toBe(401);
    });
  });

  describe("getBracket", () => {
    it("should get bracket by ID", async () => {
      const result = await rpcAsJudge("bracket.get", { bracketId: TEST_BRACKET_ID });
      expect(result.status).toBe(200);
      expect(result.data.name).toBe("Main Bracket");
      expect(result.data.format).toBe("single_elimination");
      expect(result.data.status).toBe("draft");
      expect(result.data.divisionId).toBe(TEST_DIVISION_ID);
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
      expect(result.data.bracket).toBeDefined();
      expect(result.data.bracket.name).toBe("Main Bracket");
      expect(result.data.rounds).toBeDefined();
      expect(Array.isArray(result.data.rounds)).toBe(true);
    });

    it("should return 404 for nonexistent bracket", async () => {
      const result = await rpcAsJudge("bracket.getWithHeats", {
        bracketId: "d0000000-0000-4000-a000-000000000999",
      });
      expect(result.status).toBe(404);
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
      expect(result.data.name).toBe("Second Bracket");
      expect(result.data.format).toBe("single_elimination");
      expect(result.data.id).toBeDefined();
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
      expect(result.data.name).toBe("Updated Bracket");
    });

    it("should return 403 for judge", async () => {
      const result = await rpcAsJudge("bracket.update", {
        bracketId: TEST_BRACKET_ID,
        data: { name: "Updated" },
      });
      expect(result.status).toBe(403);
    });
  });

  describe("deleteBracket", () => {
    it("should delete bracket as admin", async () => {
      const result = await rpcAsAdmin("bracket.delete", { bracketId: TEST_BRACKET_ID });
      expect(result.status).toBe(200);
      expect(result.data.message).toBe("Bracket deleted successfully");
    });

    it("should return 403 for judge", async () => {
      const result = await rpcAsJudge("bracket.delete", { bracketId: TEST_BRACKET_ID });
      expect(result.status).toBe(403);
    });
  });
});
