import { afterEach, beforeAll, beforeEach, describe, expect, it, spyOn } from "bun:test";
import type { BunRequest } from "bun";
import { sessionRepository as middlewareSessionRepository } from "../../src/api/middleware/auth.js";
import {
  handleGetMe,
  handleLogin,
  handleLogout,
  sessionRepository,
  userRepository,
} from "../../src/api/routes/auth.js";
import type { Session, User } from "../../src/domain/user/types.js";
import { hashPassword } from "../../src/domain/user/user-service.js";

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
  id: "test-user-id",
  username: "testuser",
  email: null,
  passwordHash: "hashed-password",
  role: "judge",
  createdAt: new Date(),
  updatedAt: new Date(),
};

const TEST_USER_2: User = {
  id: "test-user-2-id",
  username: "testuser2",
  email: null,
  passwordHash: "hashed-password-2",
  role: "head_judge",
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

describe("Authentication API Tests", () => {
  let getUserByUsernameSpy: ReturnType<typeof spyOn>;
  let createSessionSpy: ReturnType<typeof spyOn>;
  let getSessionByTokenSpy: ReturnType<typeof spyOn>;
  let deleteSessionSpy: ReturnType<typeof spyOn>;

  beforeAll(async () => {
    // Set up password hashes for test users
    TEST_USER.passwordHash = await hashPassword("testpassword123");
    TEST_USER_2.passwordHash = await hashPassword("testpassword456");
  });

  beforeEach(() => {
    // Set up spies
    getUserByUsernameSpy = spyOn(userRepository, "getUserByUsername");
    createSessionSpy = spyOn(sessionRepository, "createSession");
    getSessionByTokenSpy = spyOn(middlewareSessionRepository, "getSessionByToken");
    deleteSessionSpy = spyOn(sessionRepository, "deleteSession");
  });

  afterEach(() => {
    // Reset spies
    getUserByUsernameSpy.mockRestore();
    createSessionSpy.mockRestore();
    getSessionByTokenSpy.mockRestore();
    deleteSessionSpy.mockRestore();
  });

  describe("POST /api/auth/login", () => {
    it("should login successfully with valid credentials", async () => {
      getUserByUsernameSpy.mockResolvedValue(TEST_USER);
      createSessionSpy.mockResolvedValue(TEST_SESSION);

      const request = createMockRequest("POST", "/api/auth/login", {
        body: {
          username: TEST_USER.username,
          password: "testpassword123",
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

      expect(getUserByUsernameSpy).toHaveBeenCalledWith(TEST_USER.username);
      expect(createSessionSpy).toHaveBeenCalledWith(TEST_USER.id);
    });

    it("should return 401 with invalid username", async () => {
      getUserByUsernameSpy.mockResolvedValue(null);

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
      getUserByUsernameSpy.mockResolvedValue(TEST_USER);

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
      deleteSessionSpy.mockResolvedValue();

      const logoutRequest = createMockRequest("POST", "/api/auth/logout", {
        cookies: `session_token=${TEST_SESSION.token}`,
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

      expect(deleteSessionSpy).toHaveBeenCalledWith(TEST_SESSION.token);
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
      getSessionByTokenSpy.mockResolvedValue({
        ...TEST_SESSION,
        user: TEST_USER,
      });

      const meRequest = createMockRequest("GET", "/api/auth/me", {
        cookies: `session_token=${TEST_SESSION.token}`,
      });

      const meResponse = await handleGetMe(meRequest);
      expect(meResponse.status).toBe(200);

      const data = (await meResponse.json()) as {
        user: { id: string; username: string; role: string };
      };
      expect(data.user).toBeDefined();
      expect(data.user.username).toBe(TEST_USER.username);
      expect(data.user.role).toBe(TEST_USER.role);

      expect(getSessionByTokenSpy).toHaveBeenCalledWith(TEST_SESSION.token);
    });

    it("should return 401 when not authenticated", async () => {
      const meRequest = createMockRequest("GET", "/api/auth/me");

      const meResponse = await handleGetMe(meRequest);
      expect(meResponse.status).toBe(401);

      const data = (await meResponse.json()) as { error: string };
      expect(data.error).toBe("Authentication required");
    });

    it("should return 401 with invalid session token", async () => {
      getSessionByTokenSpy.mockResolvedValue(null);

      const meRequest = createMockRequest("GET", "/api/auth/me", {
        cookies: "session_token=invalid-token",
      });

      const meResponse = await handleGetMe(meRequest);
      expect(meResponse.status).toBe(401);

      const data = (await meResponse.json()) as { error: string };
      expect(data.error).toBe("Invalid or expired session");
    });

    it("should return 401 with expired session", async () => {
      getSessionByTokenSpy.mockResolvedValue(null);

      const meRequest = createMockRequest("GET", "/api/auth/me", {
        cookies: `session_token=expired-token`,
      });

      const meResponse = await handleGetMe(meRequest);
      expect(meResponse.status).toBe(401);

      const data = (await meResponse.json()) as { error: string };
      expect(data.error).toBe("Invalid or expired session");
    });
  });

  describe("Session Management", () => {
    it("should create a new session on login", async () => {
      const newSession: Session = {
        ...TEST_SESSION,
        userId: TEST_USER_2.id,
        token: "new-session-token",
      };

      getUserByUsernameSpy.mockResolvedValue(TEST_USER_2);
      createSessionSpy.mockResolvedValue(newSession);

      const request = createMockRequest("POST", "/api/auth/login", {
        body: {
          username: TEST_USER_2.username,
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
      expect(sessionToken).toBe("new-session-token");

      expect(createSessionSpy).toHaveBeenCalledWith(TEST_USER_2.id);
    });

    it("should delete session on logout", async () => {
      deleteSessionSpy.mockResolvedValue();

      const logoutRequest = createMockRequest("POST", "/api/auth/logout", {
        cookies: `session_token=${TEST_SESSION.token}`,
      });

      const logoutResponse = await handleLogout(logoutRequest);
      expect(logoutResponse.status).toBe(200);

      expect(deleteSessionSpy).toHaveBeenCalledWith(TEST_SESSION.token);
    });
  });
});
