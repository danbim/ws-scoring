import { afterAll, beforeAll, beforeEach, describe, expect, it } from "bun:test";
import type { BunRequest } from "bun";
import { handleGetMe, handleLogin, handleLogout } from "../../src/api/routes/auth.js";
import { createUserRepository } from "../../src/infrastructure/repositories/index.js";
import { clearTestData, getTestDb, setupTestDb, teardownTestDb } from "../test-db.js";

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

describe("Authentication API Tests", () => {
  beforeAll(async () => {
    await setupTestDb();
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  beforeEach(async () => {
    await clearTestData();

    const db = getTestDb();
    const userRepo = createUserRepository(db);

    // Create test users in the database
    // Note: createUser() hashes the password internally
    await userRepo.createUser({
      username: "testuser",
      email: "testuser@test.com",
      password: "testpassword123",
      role: "judge",
    });

    await userRepo.createUser({
      username: "testuser2",
      email: "testuser2@test.com",
      password: "testpassword456",
      role: "head_judge",
    });
  });

  describe("POST /api/auth/login", () => {
    it("should login successfully with valid credentials", async () => {
      const request = createMockRequest("POST", "/api/auth/login", {
        body: {
          username: "testuser",
          password: "testpassword123",
        },
      });

      const response = await handleLogin(request);
      expect(response.status).toBe(200);

      const data = (await response.json()) as {
        user: { id: string; username: string; role: string };
      };
      expect(data.user).toBeDefined();
      expect(data.user.username).toBe("testuser");
      expect(data.user.role).toBe("judge");

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
          password: "testpassword123",
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
          username: "testuser",
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
          password: "testpassword123",
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
          username: "testuser",
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
      // Login first to get a session token
      const loginRequest = createMockRequest("POST", "/api/auth/login", {
        body: {
          username: "testuser",
          password: "testpassword123",
        },
      });

      const loginResponse = await handleLogin(loginRequest);
      expect(loginResponse.status).toBe(200);

      const setCookieHeader = loginResponse.headers.get("Set-Cookie");
      if (!setCookieHeader) throw new Error("Set-Cookie header not found");
      const sessionToken = setCookieHeader.split("session_token=")[1]?.split(";")[0] || "";

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
      // Login first
      const loginRequest = createMockRequest("POST", "/api/auth/login", {
        body: {
          username: "testuser",
          password: "testpassword123",
        },
      });

      const loginResponse = await handleLogin(loginRequest);
      expect(loginResponse.status).toBe(200);

      const setCookieHeader = loginResponse.headers.get("Set-Cookie");
      if (!setCookieHeader) throw new Error("Set-Cookie header not found");
      const sessionToken = setCookieHeader.split("session_token=")[1]?.split(";")[0] || "";

      // Now get /me
      const meRequest = createMockRequest("GET", "/api/auth/me", {
        cookies: `session_token=${sessionToken}`,
      });

      const meResponse = await handleGetMe(meRequest);
      expect(meResponse.status).toBe(200);

      const data = (await meResponse.json()) as {
        user: { id: string; username: string; role: string };
      };
      expect(data.user).toBeDefined();
      expect(data.user.username).toBe("testuser");
      expect(data.user.role).toBe("judge");
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
      const meRequest = createMockRequest("GET", "/api/auth/me", {
        cookies: "session_token=expired-token",
      });

      const meResponse = await handleGetMe(meRequest);
      expect(meResponse.status).toBe(401);

      const data = (await meResponse.json()) as { error: string };
      expect(data.error).toBe("Invalid or expired session");
    });
  });

  describe("Session Management", () => {
    it("should create a new session on login", async () => {
      const request = createMockRequest("POST", "/api/auth/login", {
        body: {
          username: "testuser2",
          password: "testpassword456",
        },
      });

      const response = await handleLogin(request);
      expect(response.status).toBe(200);

      // Extract session token
      const setCookieHeader = response.headers.get("Set-Cookie");
      expect(setCookieHeader).toBeDefined();
      if (!setCookieHeader) throw new Error("Set-Cookie header not found");
      const sessionToken = setCookieHeader.split("session_token=")[1]?.split(";")[0];
      expect(sessionToken).toBeTruthy();
    });

    it("should delete session on logout", async () => {
      // Login first
      const loginRequest = createMockRequest("POST", "/api/auth/login", {
        body: {
          username: "testuser",
          password: "testpassword123",
        },
      });

      const loginResponse = await handleLogin(loginRequest);
      expect(loginResponse.status).toBe(200);

      const setCookieHeader = loginResponse.headers.get("Set-Cookie");
      if (!setCookieHeader) throw new Error("Set-Cookie header not found");
      const sessionToken = setCookieHeader.split("session_token=")[1]?.split(";")[0] || "";

      // Logout
      const logoutRequest = createMockRequest("POST", "/api/auth/logout", {
        cookies: `session_token=${sessionToken}`,
      });

      const logoutResponse = await handleLogout(logoutRequest);
      expect(logoutResponse.status).toBe(200);

      // Verify session is gone by trying /me
      const meRequest = createMockRequest("GET", "/api/auth/me", {
        cookies: `session_token=${sessionToken}`,
      });

      const meResponse = await handleGetMe(meRequest);
      expect(meResponse.status).toBe(401);
    });
  });
});
