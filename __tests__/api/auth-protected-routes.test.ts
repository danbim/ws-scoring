import { afterAll, beforeAll, beforeEach, describe, expect, it } from "bun:test";
import type { BunRequest } from "bun";
import { withAuth } from "../../src/api/helpers.js";
import { handleLogin } from "../../src/api/routes/auth.js";
import { handleCreateHeat, handleGetHeat } from "../../src/api/routes/heat-routes.js";
import { getDb } from "../../src/infrastructure/db/index.js";
import {
  brackets,
  contests,
  divisions,
  riders,
  seasons,
} from "../../src/infrastructure/db/schema.js";
import {
  createHeatRepository,
  createUserRepository,
} from "../../src/infrastructure/repositories/index.js";
import { clearTestData, setupTestDb, teardownTestDb } from "../test-db.js";
import { DEFAULT_TEST_BRACKET_ID } from "../test-utils.js";
import { RIDER_1 } from "./shared.js";

// Helper to create a mock BunRequest with cookies
function createMockRequest(
  method: string,
  path: string,
  options?: {
    body?: unknown;
    cookies?: string;
    headers?: Record<string, string>;
  }
): BunRequest {
  const headers = new Headers({
    "Content-Type": "application/json",
    ...options?.headers,
  });
  if (options?.cookies) {
    headers.set("cookie", options.cookies);
  }

  const requestInit: RequestInit = {
    method,
    headers,
  };

  if (options?.body) {
    requestInit.body = JSON.stringify(options.body);
  }

  const request = new Request(`http://localhost${path}`, requestInit) as BunRequest;
  return request;
}

describe("Protected Routes Authentication Tests", () => {
  const TEST_PASSWORD = "testpassword123";
  let sessionToken: string;

  beforeAll(async () => {
    await setupTestDb();
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  beforeEach(async () => {
    // Clear all data from previous test
    await clearTestData();

    // Set up test data hierarchy
    const TEST_SEASON_ID = "00000000-0000-0000-0000-000000000001";
    const TEST_CONTEST_ID = "00000000-0000-0000-0000-000000000002";
    const TEST_DIVISION_ID = "00000000-0000-0000-0000-000000000003";
    const TEST_RIDER_1_ID = RIDER_1;

    const db = await getDb();
    const heatRepository = createHeatRepository(db);
    const userRepo = createUserRepository(db);

    // Insert test data hierarchy
    await db.insert(seasons).values({
      id: TEST_SEASON_ID,
      name: "Test Season",
      year: 2025,
      startDate: new Date("2025-01-01"),
      endDate: new Date("2025-12-31"),
    });

    await db.insert(contests).values({
      id: TEST_CONTEST_ID,
      seasonId: TEST_SEASON_ID,
      name: "Test Contest",
      location: "Test Location",
      startDate: new Date("2025-06-01"),
      endDate: new Date("2025-06-07"),
      status: "in_progress",
    });

    await db.insert(divisions).values({
      id: TEST_DIVISION_ID,
      contestId: TEST_CONTEST_ID,
      name: "Test Division",
      category: "pro_men",
    });

    await db.insert(brackets).values({
      id: DEFAULT_TEST_BRACKET_ID,
      divisionId: TEST_DIVISION_ID,
      name: "Test Bracket",
      format: "single_elimination",
      status: "in_progress",
    });

    await db.insert(riders).values({
      id: TEST_RIDER_1_ID,
      firstName: "Test",
      lastName: "Rider One",
      country: "US",
      sailNumber: "US-1",
    });

    // Clean up all heats
    const allHeats = await heatRepository.getAllHeats();
    for (const heat of allHeats) {
      await heatRepository.deleteHeat(heat.heatId);
    }

    // Create test user and get session token
    // Note: createUser() hashes the password internally
    await userRepo.createUser({
      username: "protected-test-user",
      email: "protected@test.com",
      password: TEST_PASSWORD,
      role: "judge",
    });

    // Login to get a session token
    const loginRequest = createMockRequest("POST", "/api/auth/login", {
      body: {
        username: "protected-test-user",
        password: TEST_PASSWORD,
      },
    });

    const loginResponse = await handleLogin(loginRequest);
    const setCookieHeader = loginResponse.headers.get("Set-Cookie");
    if (setCookieHeader) {
      sessionToken = setCookieHeader.split("session_token=")[1]?.split(";")[0] || "";
    }
  });

  describe("Protected Route Access", () => {
    it("should allow access to protected routes when authenticated", async () => {
      const heatId = `protected-heat-${Date.now()}`;
      const request = createMockRequest("POST", "/api/heats", {
        body: {
          heatId,
          bracketId: DEFAULT_TEST_BRACKET_ID,
          riderIds: [RIDER_1],
          heatRules: {
            wavesCounting: 2,
            jumpsCounting: 1,
          },
          position: heatId,
          roundNumber: 1,
          roundName: "Round 1",
        },
        cookies: `session_token=${sessionToken}`,
      });

      const response = await withAuth(request, (req) => handleCreateHeat(req));
      expect(response.status).toBe(200);

      const data = (await response.json()) as { heatId: string };
      expect(data.heatId).toBe(heatId);
    });

    it("should deny access to protected routes when not authenticated", async () => {
      const heatId = `protected-heat-${Date.now()}`;
      const request = createMockRequest("POST", "/api/heats", {
        body: {
          heatId,
          bracketId: DEFAULT_TEST_BRACKET_ID,
          riderIds: [RIDER_1],
          heatRules: {
            wavesCounting: 2,
            jumpsCounting: 1,
          },
          position: heatId,
          roundNumber: 1,
          roundName: "Round 1",
        },
      });

      const response = await withAuth(request, (req) => handleCreateHeat(req));
      expect(response.status).toBe(401);

      const data = (await response.json()) as { error: string };
      expect(data.error).toBe("Authentication required");
    });

    it("should deny access to protected routes with invalid session token", async () => {
      const heatId = `protected-heat-${Date.now()}`;
      const request = createMockRequest("POST", "/api/heats", {
        body: {
          heatId,
          bracketId: DEFAULT_TEST_BRACKET_ID,
          riderIds: [RIDER_1],
          heatRules: {
            wavesCounting: 2,
            jumpsCounting: 1,
          },
          position: heatId,
          roundNumber: 1,
          roundName: "Round 1",
        },
        cookies: "session_token=invalid-token",
      });

      const response = await withAuth(request, (req) => handleCreateHeat(req));
      expect(response.status).toBe(401);

      const data = (await response.json()) as { error: string };
      expect(data.error).toBe("Invalid or expired session");
    });

    it("should allow access to GET protected routes when authenticated", async () => {
      // First create a heat with auth
      const heatId = `protected-heat-get-${Date.now()}`;
      const createRequest = createMockRequest("POST", "/api/heats", {
        body: {
          heatId,
          bracketId: DEFAULT_TEST_BRACKET_ID,
          riderIds: [RIDER_1],
          heatRules: {
            wavesCounting: 2,
            jumpsCounting: 1,
          },
          position: heatId,
          roundNumber: 1,
          roundName: "Round 1",
        },
        cookies: `session_token=${sessionToken}`,
      });

      await withAuth(createRequest, (req) => handleCreateHeat(req));

      // Now get it with auth
      const getRequest = createMockRequest("GET", `/api/heats/${heatId}`, {
        cookies: `session_token=${sessionToken}`,
      });

      const response = await withAuth(getRequest, (req) => handleGetHeat(heatId, req));
      expect(response.status).toBe(200);
    });
  });
});
