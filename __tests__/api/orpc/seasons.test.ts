import { afterAll, beforeAll, beforeEach, describe, expect, it } from "bun:test";
import { getDb } from "../../../src/infrastructure/db/index.js";
import { seasons } from "../../../src/infrastructure/db/schema.js";
import { clearTestData, setupTestDb, teardownTestDb } from "../../test-db.js";
import { ADMIN_TOKEN, JUDGE_TOKEN, rpc, seedTestUsers, TEST_SEASON_ID } from "./helpers.js";

describe("Season oRPC Procedures", () => {
  beforeAll(async () => {
    await setupTestDb();
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  beforeEach(async () => {
    await clearTestData();
    await seedTestUsers();

    const db = await getDb();
    await db.insert(seasons).values({
      id: TEST_SEASON_ID,
      name: "Test Season",
      year: 2025,
      startDate: new Date("2025-01-01"),
      endDate: new Date("2025-12-31"),
    });
  });

  describe("listSeasons", () => {
    it("should list seasons when authenticated", async () => {
      const result = await rpc("season.list", undefined, `session_token=${ADMIN_TOKEN}`);

      expect(result.status).toBe(200);
      expect(result.data.seasons).toHaveLength(1);
      expect(result.data.seasons[0].name).toBe("Test Season");
    });

    it("should return 401 without auth", async () => {
      const result = await rpc("season.list");
      expect(result.status).toBe(401);
    });
  });

  describe("getSeason", () => {
    it("should get season by ID", async () => {
      const result = await rpc(
        "season.get",
        { seasonId: TEST_SEASON_ID },
        `session_token=${ADMIN_TOKEN}`
      );

      expect(result.status).toBe(200);
      expect(result.data.name).toBe("Test Season");
      expect(result.data.year).toBe(2025);
    });

    it("should return 404 for nonexistent season", async () => {
      const result = await rpc(
        "season.get",
        { seasonId: "d0000000-0000-4000-a000-000000000999" },
        `session_token=${ADMIN_TOKEN}`
      );
      expect(result.status).toBe(404);
    });
  });

  describe("createSeason", () => {
    it("should create season as admin", async () => {
      const result = await rpc(
        "season.create",
        { name: "New Season", year: 2026, startDate: "2026-01-01", endDate: "2026-12-31" },
        `session_token=${ADMIN_TOKEN}`
      );
      expect(result.status).toBe(200);
      expect(result.data.name).toBe("New Season");
      expect(result.data.year).toBe(2026);
      expect(result.data.id).toBeDefined();
    });

    it("should return 403 for judge", async () => {
      const result = await rpc(
        "season.create",
        { name: "New Season", year: 2026, startDate: "2026-01-01", endDate: "2026-12-31" },
        `session_token=${JUDGE_TOKEN}`
      );
      expect(result.status).toBe(403);
    });
  });

  describe("updateSeason", () => {
    it("should update season as admin", async () => {
      const result = await rpc(
        "season.update",
        { seasonId: TEST_SEASON_ID, data: { name: "Updated Season" } },
        `session_token=${ADMIN_TOKEN}`
      );
      expect(result.status).toBe(200);
      expect(result.data.name).toBe("Updated Season");
    });

    it("should return 403 for judge", async () => {
      const result = await rpc(
        "season.update",
        { seasonId: TEST_SEASON_ID, data: { name: "Updated" } },
        `session_token=${JUDGE_TOKEN}`
      );
      expect(result.status).toBe(403);
    });
  });

  describe("deleteSeason", () => {
    it("should delete season as admin", async () => {
      const result = await rpc(
        "season.delete",
        { seasonId: TEST_SEASON_ID },
        `session_token=${ADMIN_TOKEN}`
      );
      expect(result.status).toBe(200);
      expect(result.data.message).toBe("Season deleted successfully");
    });

    it("should return 403 for judge", async () => {
      const result = await rpc(
        "season.delete",
        { seasonId: TEST_SEASON_ID },
        `session_token=${JUDGE_TOKEN}`
      );
      expect(result.status).toBe(403);
    });
  });
});
