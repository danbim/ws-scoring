import { afterEach, beforeAll, beforeEach, describe, expect, it, spyOn } from "bun:test";
import type { BunRequest } from "bun";
import { withAuth } from "../../src/api/helpers.js";
import { sessionRepository as middlewareSessionRepository } from "../../src/api/middleware/auth.js";
import { handleLogin, sessionRepository, userRepository } from "../../src/api/routes/auth.js";
import { handleCreateHeat, handleGetHeat } from "../../src/api/routes.js";
import type { Session, User } from "../../src/domain/user/types.js";
import { hashPassword } from "../../src/domain/user/user-service.js";
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
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
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

  beforeEach(() => {
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
          riderIds: [RIDER_1],
          heatRules: {
            wavesCounting: 2,
            jumpsCounting: 1,
          },
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
          riderIds: [RIDER_1],
          heatRules: {
            wavesCounting: 2,
            jumpsCounting: 1,
          },
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
          riderIds: [RIDER_1],
          heatRules: {
            wavesCounting: 2,
            jumpsCounting: 1,
          },
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
          riderIds: [RIDER_1],
          heatRules: {
            wavesCounting: 2,
            jumpsCounting: 1,
          },
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
