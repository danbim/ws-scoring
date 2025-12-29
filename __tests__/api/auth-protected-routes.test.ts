import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import type { BunRequest } from "bun";
import { eq } from "drizzle-orm";
import { withAuth } from "../../src/api/helpers.js";
import { handleLogin } from "../../src/api/routes/auth.js";
import { handleCreateHeat, handleGetHeat } from "../../src/api/routes.js";
import { hashPassword } from "../../src/domain/user/user-service.js";
import { connectDb, disconnectDb, getDb } from "../../src/infrastructure/db/index.js";
import { sessions, users } from "../../src/infrastructure/db/schema.js";
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
const TEST_USER = {
  username: "protected-test-user",
  password: "testpassword123",
  role: "judge" as const,
};

describe("Protected Routes Authentication Tests", () => {
  let testUserId: string;
  let sessionToken: string;

  beforeAll(async () => {
    // Connect to database
    await connectDb();
    const db = await getDb();

    // Create test user
    const passwordHash = await hashPassword(TEST_USER.password);
    const [user] = await db
      .insert(users)
      .values({
        username: TEST_USER.username,
        passwordHash,
        role: TEST_USER.role,
      })
      .returning();

    testUserId = user.id;

    // Login to get a session token
    const loginRequest = createMockRequest("POST", "/api/auth/login", {
      body: {
        username: TEST_USER.username,
        password: TEST_USER.password,
      },
    });

    const loginResponse = await handleLogin(loginRequest);
    expect(loginResponse.status).toBe(200);

    // Extract session token from cookie
    const setCookieHeader = loginResponse.headers.get("Set-Cookie");
    if (!setCookieHeader) throw new Error("Set-Cookie header not found");
    sessionToken = setCookieHeader.split("session_token=")[1]?.split(";")[0] || "";
    if (!sessionToken) throw new Error("Session token not found in cookie");
  });

  afterAll(async () => {
    // Clean up test data
    const db = await getDb();
    await db.delete(sessions).where(eq(sessions.userId, testUserId));
    await db.delete(users).where(eq(users.id, testUserId));
    await disconnectDb();
  });

  describe("Protected Route Access", () => {
    it("should allow access to protected routes when authenticated", async () => {
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
        cookies: `session_token=${sessionToken}`,
      });

      await withAuth(createRequest, (req) => handleCreateHeat(req));

      // Now get it with auth
      const getRequest = createMockRequest("GET", `/api/heats/${heatId}`, {
        cookies: `session_token=${sessionToken}`,
      });

      // Note: handleGetHeat doesn't take a request with user, so we need to call it differently
      // Actually, looking at the implementation, handleGetHeat doesn't use the request parameter
      // for user, it's separate. Let's test that it requires auth wrapper
      const response = await withAuth(getRequest, () => handleGetHeat(heatId));
      expect(response.status).toBe(200);
    });
  });
});
