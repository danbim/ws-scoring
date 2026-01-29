import { afterAll, beforeAll, beforeEach, describe, expect, it } from "bun:test";
import { RPCHandler } from "@orpc/server/fetch";
import { appRouter } from "../../../src/api/orpc/router.js";
import { getDb } from "../../../src/infrastructure/db/index.js";
import { seasons, sessions, users } from "../../../src/infrastructure/db/schema.js";
import { clearTestData, setupTestDb, teardownTestDb } from "../../test-db.js";

const handler = new RPCHandler(appRouter);

const ADMIN_USER_ID = "a0000000-0000-4000-a000-000000000a01";
const JUDGE_USER_ID = "a0000000-0000-4000-a000-000000000a02";
const ADMIN_TOKEN = "b0000000-0000-4000-b000-000000000b01";
const JUDGE_TOKEN = "b0000000-0000-4000-b000-000000000b02";
const TEST_SEASON_ID = "c0000000-0000-4000-a000-000000000c01";

type RpcData = any; // eslint-disable-line @typescript-eslint/no-explicit-any

interface RpcResult {
  status: number;
  data: RpcData;
}

async function rpc(procedurePath: string, input?: unknown, cookie?: string): Promise<RpcResult> {
  const urlPath = procedurePath.replace(/\./g, "/");
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (cookie) headers.cookie = cookie;
  const request = new Request(`http://localhost/rpc/${urlPath}`, {
    method: "POST",
    headers,
    body: input !== undefined ? JSON.stringify({ json: input, meta: [] }) : undefined,
  });
  const { matched, response } = await handler.handle(request, {
    prefix: "/rpc",
    context: { request },
  });
  if (!matched || !response) {
    throw new Error(`No procedure matched for path: ${urlPath}`);
  }
  const body = await response.json();
  return { status: response.status, data: body.json ?? body };
}

describe("Season oRPC Procedures", () => {
  beforeAll(async () => {
    await setupTestDb();
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  beforeEach(async () => {
    await clearTestData();
    const db = await getDb();

    await db.insert(users).values([
      {
        id: ADMIN_USER_ID,
        username: "admin",
        email: null,
        passwordHash: "hashed",
        role: "administrator",
      },
      {
        id: JUDGE_USER_ID,
        username: "judge",
        email: null,
        passwordHash: "hashed",
        role: "judge",
      },
    ]);

    await db.insert(sessions).values([
      {
        userId: ADMIN_USER_ID,
        token: ADMIN_TOKEN,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
      {
        userId: JUDGE_USER_ID,
        token: JUDGE_TOKEN,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    ]);

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
