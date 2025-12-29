import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import type { BunRequest } from "bun";
import { eq } from "drizzle-orm";
import { handleGetMe, handleLogin, handleLogout } from "../../src/api/routes/auth.js";
import { hashPassword } from "../../src/domain/user/user-service.js";
import { connectDb, disconnectDb, getDb } from "../../src/infrastructure/db/index.js";
import { sessions, users } from "../../src/infrastructure/db/schema.js";
import { createSession } from "../../src/infrastructure/session-store.js";

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
  username: "testuser",
  password: "testpassword123",
  role: "judge" as const,
};

const TEST_USER_2 = {
  username: "testuser2",
  password: "testpassword456",
  role: "head_judge" as const,
};

describe("Authentication API Tests", () => {
  let testUserId: string;
  let testUser2Id: string;

  beforeAll(async () => {
    // Connect to database
    await connectDb();
    const db = await getDb();

    // Create test users
    const passwordHash1 = await hashPassword(TEST_USER.password);
    const passwordHash2 = await hashPassword(TEST_USER_2.password);

    const [user1] = await db
      .insert(users)
      .values({
        username: TEST_USER.username,
        passwordHash: passwordHash1,
        role: TEST_USER.role,
      })
      .returning();

    const [user2] = await db
      .insert(users)
      .values({
        username: TEST_USER_2.username,
        passwordHash: passwordHash2,
        role: TEST_USER_2.role,
      })
      .returning();

    testUserId = user1.id;
    testUser2Id = user2.id;
  });

  afterAll(async () => {
    // Clean up test data
    const db = await getDb();
    await db.delete(sessions).where(eq(sessions.userId, testUserId));
    await db.delete(sessions).where(eq(sessions.userId, testUser2Id));
    await db.delete(users).where(eq(users.id, testUserId));
    await db.delete(users).where(eq(users.id, testUser2Id));
    await disconnectDb();
  });

  describe("POST /api/auth/login", () => {
    it("should login successfully with valid credentials", async () => {
      const request = createMockRequest("POST", "/api/auth/login", {
        body: {
          username: TEST_USER.username,
          password: TEST_USER.password,
        },
      });

      const response = await handleLogin(request);
      expect(response.status).toBe(200);

      const data = (await response.json()) as {
        user: { id: string; username: string; role: string };
      };
      expect(data.user).toBeDefined();
      expect(data.user.username).toBe(TEST_USER.username);
      expect(data.user.role).toBe(TEST_USER.role);

      // Check that session cookie is set
      const setCookieHeader = response.headers.get("Set-Cookie");
      expect(setCookieHeader).toBeDefined();
      expect(setCookieHeader).toContain("session_token");
      expect(setCookieHeader).toContain("HttpOnly");
    });

    it("should return 401 with invalid username", async () => {
      const request = createMockRequest("POST", "/api/auth/login", {
        body: {
          username: "nonexistent",
          password: TEST_USER.password,
        },
      });

      const response = await handleLogin(request);
      expect(response.status).toBe(401);

      const data = (await response.json()) as { error: string };
      expect(data.error).toBe("Invalid username or password");
    });

    it("should return 401 with invalid password", async () => {
      const request = createMockRequest("POST", "/api/auth/login", {
        body: {
          username: TEST_USER.username,
          password: "wrongpassword",
        },
      });

      const response = await handleLogin(request);
      expect(response.status).toBe(401);

      const data = (await response.json()) as { error: string };
      expect(data.error).toBe("Invalid username or password");
    });

    it("should return 400 with missing username", async () => {
      const request = createMockRequest("POST", "/api/auth/login", {
        body: {
          password: TEST_USER.password,
        },
      });

      const response = await handleLogin(request);
      expect(response.status).toBe(400);

      const data = (await response.json()) as { error: string };
      expect(data.error).toContain("Validation error");
    });

    it("should return 400 with missing password", async () => {
      const request = createMockRequest("POST", "/api/auth/login", {
        body: {
          username: TEST_USER.username,
        },
      });

      const response = await handleLogin(request);
      expect(response.status).toBe(400);

      const data = (await response.json()) as { error: string };
      expect(data.error).toContain("Validation error");
    });
  });

  describe("POST /api/auth/logout", () => {
    it("should logout successfully and clear session cookie", async () => {
      // First login to get a session
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
      expect(setCookieHeader).toBeDefined();
      if (!setCookieHeader) throw new Error("Set-Cookie header not found");
      const sessionToken = setCookieHeader.split("session_token=")[1]?.split(";")[0];
      if (!sessionToken) throw new Error("Session token not found in cookie");

      // Now logout
      const logoutRequest = createMockRequest("POST", "/api/auth/logout", {
        cookies: `session_token=${sessionToken}`,
      });

      const logoutResponse = await handleLogout(logoutRequest);
      expect(logoutResponse.status).toBe(200);

      const data = (await logoutResponse.json()) as { message: string };
      expect(data.message).toBe("Logged out successfully");

      // Check that session cookie is cleared
      const clearCookieHeader = logoutResponse.headers.get("Set-Cookie");
      expect(clearCookieHeader).toBeDefined();
      expect(clearCookieHeader).toContain("session_token=;");
      expect(clearCookieHeader).toContain("Expires=Thu, 01 Jan 1970 00:00:00 GMT");
    });

    it("should logout successfully even without valid session", async () => {
      const logoutRequest = createMockRequest("POST", "/api/auth/logout");

      const logoutResponse = await handleLogout(logoutRequest);
      expect(logoutResponse.status).toBe(200);

      const data = (await logoutResponse.json()) as { message: string };
      expect(data.message).toBe("Logged out successfully");
    });
  });

  describe("GET /api/auth/me", () => {
    it("should return current user when authenticated", async () => {
      // First login to get a session
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
      expect(setCookieHeader).toBeDefined();
      if (!setCookieHeader) throw new Error("Set-Cookie header not found");
      const sessionToken = setCookieHeader.split("session_token=")[1]?.split(";")[0];
      if (!sessionToken) throw new Error("Session token not found in cookie");

      // Get current user
      const meRequest = createMockRequest("GET", "/api/auth/me", {
        cookies: `session_token=${sessionToken}`,
      });

      const meResponse = await handleGetMe(meRequest);
      expect(meResponse.status).toBe(200);

      const data = (await meResponse.json()) as {
        user: { id: string; username: string; role: string };
      };
      expect(data.user).toBeDefined();
      expect(data.user.username).toBe(TEST_USER.username);
      expect(data.user.role).toBe(TEST_USER.role);
    });

    it("should return 401 when not authenticated", async () => {
      const meRequest = createMockRequest("GET", "/api/auth/me");

      const meResponse = await handleGetMe(meRequest);
      expect(meResponse.status).toBe(401);

      const data = (await meResponse.json()) as { error: string };
      expect(data.error).toBe("Authentication required");
    });

    it("should return 401 with invalid session token", async () => {
      const meRequest = createMockRequest("GET", "/api/auth/me", {
        cookies: "session_token=invalid-token",
      });

      const meResponse = await handleGetMe(meRequest);
      expect(meResponse.status).toBe(401);

      const data = (await meResponse.json()) as { error: string };
      expect(data.error).toBe("Invalid or expired session");
    });

    it("should return 401 with expired session", async () => {
      // Create an expired session manually
      const db = await getDb();
      const expiredDate = new Date(Date.now() - 1000); // 1 second ago
      const [expiredSession] = await db
        .insert(sessions)
        .values({
          userId: testUserId,
          expiresAt: expiredDate,
        })
        .returning();

      const meRequest = createMockRequest("GET", "/api/auth/me", {
        cookies: `session_token=${expiredSession.token}`,
      });

      const meResponse = await handleGetMe(meRequest);
      expect(meResponse.status).toBe(401);

      const data = (await meResponse.json()) as { error: string };
      expect(data.error).toBe("Invalid or expired session");

      // Clean up
      await db.delete(sessions).where(eq(sessions.id, expiredSession.id));
    });
  });

  describe("Session Management", () => {
    it("should create a new session on login", async () => {
      const request = createMockRequest("POST", "/api/auth/login", {
        body: {
          username: TEST_USER_2.username,
          password: TEST_USER_2.password,
        },
      });

      const response = await handleLogin(request);
      expect(response.status).toBe(200);

      // Extract session token
      const setCookieHeader = response.headers.get("Set-Cookie");
      if (!setCookieHeader) throw new Error("Set-Cookie header not found");
      const sessionToken = setCookieHeader.split("session_token=")[1]?.split(";")[0];
      if (!sessionToken) throw new Error("Session token not found in cookie");

      // Verify session exists in database
      const db = await getDb();
      const [sessionRow] = await db
        .select({
          session: sessions,
          user: users,
        })
        .from(sessions)
        .innerJoin(users, eq(sessions.userId, users.id))
        .where(eq(sessions.token, sessionToken))
        .limit(1);

      expect(sessionRow).toBeDefined();
      expect(sessionRow.session.userId).toBe(testUser2Id);

      // Clean up
      await db.delete(sessions).where(eq(sessions.token, sessionToken));
    });

    it("should delete session on logout", async () => {
      // Create a session manually
      const session = await createSession(testUserId);

      // Verify it exists
      const db = await getDb();
      const [existingSession] = await db
        .select()
        .from(sessions)
        .where(eq(sessions.token, session.token))
        .limit(1);
      expect(existingSession).toBeDefined();

      // Logout
      const logoutRequest = createMockRequest("POST", "/api/auth/logout", {
        cookies: `session_token=${session.token}`,
      });

      const logoutResponse = await handleLogout(logoutRequest);
      expect(logoutResponse.status).toBe(200);

      // Verify session is deleted
      const [deletedSession] = await db
        .select()
        .from(sessions)
        .where(eq(sessions.token, session.token))
        .limit(1);
      expect(deletedSession).toBeUndefined();
    });
  });
});
