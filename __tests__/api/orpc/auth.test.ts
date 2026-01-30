import { afterAll, beforeAll, beforeEach, describe, expect, it } from "bun:test";
import { getDb } from "../../../src/infrastructure/db/index.js";
import { users } from "../../../src/infrastructure/db/schema.js";
import { hashPassword } from "../../../src/domain/user/user-service.js";
import { clearTestData, setupTestDb, teardownTestDb } from "../../test-db.js";
import { rpc, rpcAsAdmin, seedTestUsers } from "./helpers.js";

const LOGIN_USER_ID = "a0000000-0000-4000-a000-000000000a99";

describe("Auth oRPC Procedures", () => {
  beforeAll(async () => {
    await setupTestDb();
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  beforeEach(async () => {
    await clearTestData();
    await seedTestUsers();

    // Create a user with a known password for login tests
    const db = await getDb();
    const passwordHash = await hashPassword("testpassword");
    await db.insert(users).values({
      id: LOGIN_USER_ID,
      username: "loginuser",
      email: null,
      passwordHash,
      role: "judge",
    });
  });

  describe("login", () => {
    it("should login with valid credentials", async () => {
      const result = await rpc("auth.login", {
        username: "loginuser",
        password: "testpassword",
      });

      expect(result.status).toBe(200);
      expect(result.data.user).toBeDefined();
      expect(result.data.user.username).toBe("loginuser");
      expect(result.data.user.role).toBe("judge");
      expect(result.data.user.id).toBe(LOGIN_USER_ID);
    });

    it("should return 401 for invalid password", async () => {
      const result = await rpc("auth.login", {
        username: "loginuser",
        password: "wrongpassword",
      });

      expect(result.status).toBe(401);
    });

    it("should return 401 for nonexistent user", async () => {
      const result = await rpc("auth.login", {
        username: "nonexistent",
        password: "testpassword",
      });

      expect(result.status).toBe(401);
    });
  });

  describe("me", () => {
    it("should return current user when authenticated", async () => {
      const result = await rpcAsAdmin("auth.me");

      expect(result.status).toBe(200);
      expect(result.data.user).toBeDefined();
      expect(result.data.user.username).toBe("admin");
      expect(result.data.user.role).toBe("administrator");
    });

    it("should return 401 when not authenticated", async () => {
      const result = await rpc("auth.me");

      expect(result.status).toBe(401);
    });
  });

  describe("logout", () => {
    it("should logout successfully", async () => {
      const result = await rpcAsAdmin("auth.logout");

      expect(result.status).toBe(200);
      expect(result.data.message).toBe("Logged out successfully");
    });

    it("should return 401 when not authenticated", async () => {
      const result = await rpc("auth.logout");

      expect(result.status).toBe(401);
    });
  });
});
