import { afterEach, beforeAll, beforeEach, describe, expect, it, spyOn } from "bun:test";
import type { BunRequest } from "bun";
import { eq } from "drizzle-orm";
import { withAuth } from "../../src/api/helpers.js";
import { sessionRepository as middlewareSessionRepository } from "../../src/api/middleware/auth.js";
import { handleLogin, sessionRepository, userRepository } from "../../src/api/routes/auth.js";
import { handleCreateHeat, handleGetHeat } from "../../src/api/routes/heat-routes.js";
import type { Session, User } from "../../src/domain/user/types.js";
import { hashPassword } from "../../src/domain/user/user-service.js";
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
  SESSION_DURATION_MS,
} from "../../src/infrastructure/repositories/index.js";
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

// Test user data
const TEST_USER: User = {
  id: "protected-test-user-id",
  username: "protected-test-user",
  email: null,
  passwordHash: "hashed-password",
  role: "judge",
  createdAt: new Date(),
  updatedAt: new Date(),
};

const TEST_SESSION: Session = {
  id: "session-id",
  userId: TEST_USER.id,
  token: "test-session-token",
  expiresAt: new Date(Date.now() + SESSION_DURATION_MS),
  createdAt: new Date(),
};

describe("Protected Routes Authentication Tests", () => {
  let getUserByUsernameSpy: ReturnType<typeof spyOn>;
  let createSessionSpy: ReturnType<typeof spyOn>;
  let getSessionByTokenSpy: ReturnType<typeof spyOn>;

  beforeAll(async () => {
    // Set up password hash for test user
    TEST_USER.passwordHash = await hashPassword("testpassword123");
  });

  beforeEach(async () => {
    // Set up test data hierarchy
    const TEST_SEASON_ID = "00000000-0000-0000-0000-000000000001";
    const TEST_CONTEST_ID = "00000000-0000-0000-0000-000000000002";
    const TEST_DIVISION_ID = "00000000-0000-0000-0000-000000000003";
    const TEST_RIDER_1_ID = RIDER_1; // Already defined in shared.ts with correct UUID

    const heatRepository = createHeatRepository();
    const db = await getDb();

    // Ensure test data hierarchy exists
    const [existingSeason] = await db
      .select()
      .from(seasons)
      .where(eq(seasons.id, TEST_SEASON_ID))
      .limit(1);
    if (!existingSeason) {
      await db.insert(seasons).values({
        id: TEST_SEASON_ID,
        name: "Test Season",
        year: 2025,
        startDate: new Date("2025-01-01"),
        endDate: new Date("2025-12-31"),
      });
    }

    const [existingContest] = await db
      .select()
      .from(contests)
      .where(eq(contests.id, TEST_CONTEST_ID))
      .limit(1);
    if (!existingContest) {
      await db.insert(contests).values({
        id: TEST_CONTEST_ID,
        seasonId: TEST_SEASON_ID,
        name: "Test Contest",
        location: "Test Location",
        startDate: new Date("2025-06-01"),
        endDate: new Date("2025-06-07"),
        status: "in_progress",
      });
    }

    const [existingDivision] = await db
      .select()
      .from(divisions)
      .where(eq(divisions.id, TEST_DIVISION_ID))
      .limit(1);
    if (!existingDivision) {
      await db.insert(divisions).values({
        id: TEST_DIVISION_ID,
        contestId: TEST_CONTEST_ID,
        name: "Test Division",
        category: "pro_men",
      });
    }

    const [existingBracket] = await db
      .select()
      .from(brackets)
      .where(eq(brackets.id, DEFAULT_TEST_BRACKET_ID))
      .limit(1);
    if (!existingBracket) {
      await db.insert(brackets).values({
        id: DEFAULT_TEST_BRACKET_ID,
        divisionId: TEST_DIVISION_ID,
        name: "Test Bracket",
        format: "single_elimination",
        status: "in_progress",
      });
    }

    const [existingRider1] = await db
      .select()
      .from(riders)
      .where(eq(riders.id, TEST_RIDER_1_ID))
      .limit(1);
    if (!existingRider1) {
      await db.insert(riders).values({
        id: TEST_RIDER_1_ID,
        firstName: "Test",
        lastName: "Rider One",
        country: "US",
        sailNumber: "US-1",
      });
    }

    // Clean up all heats
    const allHeats = await heatRepository.getAllHeats();
    for (const heat of allHeats) {
      await heatRepository.deleteHeat(heat.heatId);
    }

    // Set up spies
    getUserByUsernameSpy = spyOn(userRepository, "getUserByUsername");
    createSessionSpy = spyOn(sessionRepository, "createSession");
    getSessionByTokenSpy = spyOn(middlewareSessionRepository, "getSessionByToken");
  });

  afterEach(() => {
    // Reset spies
    getUserByUsernameSpy.mockRestore();
    createSessionSpy.mockRestore();
    getSessionByTokenSpy.mockRestore();
  });

  describe("Protected Route Access", () => {
    it("should allow access to protected routes when authenticated", async () => {
      getUserByUsernameSpy.mockResolvedValue(TEST_USER);
      createSessionSpy.mockResolvedValue(TEST_SESSION);
      getSessionByTokenSpy.mockResolvedValue({
        ...TEST_SESSION,
        user: TEST_USER,
      });

      // First login to get a session
      const loginRequest = createMockRequest("POST", "/api/auth/login", {
        body: {
          username: TEST_USER.username,
          password: "testpassword123",
        },
      });

      const loginResponse = await handleLogin(loginRequest);
      expect(loginResponse.status).toBe(200);

      // Extract session token from cookie
      const setCookieHeader = loginResponse.headers.get("Set-Cookie");
      if (!setCookieHeader) throw new Error("Set-Cookie header not found");
      const sessionToken = setCookieHeader.split("session_token=")[1]?.split(";")[0] || "";
      if (!sessionToken) throw new Error("Session token not found in cookie");

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
      getSessionByTokenSpy.mockResolvedValue(null);

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
      getUserByUsernameSpy.mockResolvedValue(TEST_USER);
      createSessionSpy.mockResolvedValue(TEST_SESSION);
      getSessionByTokenSpy.mockResolvedValue({
        ...TEST_SESSION,
        user: TEST_USER,
      });

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
        cookies: `session_token=${TEST_SESSION.token}`,
      });

      await withAuth(createRequest, (req) => handleCreateHeat(req));

      // Now get it with auth
      const getRequest = createMockRequest("GET", `/api/heats/${heatId}`, {
        cookies: `session_token=${TEST_SESSION.token}`,
      });

      const response = await withAuth(getRequest, () => handleGetHeat(heatId));
      expect(response.status).toBe(200);
    });
  });
});
