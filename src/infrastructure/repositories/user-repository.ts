import { eq } from "drizzle-orm";
import type { UserRepository as IUserRepository } from "../../domain/user/repositories.js";
import type { CreateUserInput, User } from "../../domain/user/types.js";
import { hashPassword } from "../../domain/user/user-service.js";
import { getDb } from "../db/index.js";
import { users } from "../db/schema.js";

export class UserRepositoryImpl implements IUserRepository {
  async getUserByUsername(username: string): Promise<User | null> {
    const db = await getDb();
    const [user] = await db.select().from(users).where(eq(users.username, username)).limit(1);

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      passwordHash: user.passwordHash,
      role: user.role as User["role"],
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async getUserById(id: string): Promise<User | null> {
    const db = await getDb();
    const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      passwordHash: user.passwordHash,
      role: user.role as User["role"],
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const db = await getDb();
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      passwordHash: user.passwordHash,
      role: user.role as User["role"],
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async getAllUsers(): Promise<User[]> {
    const db = await getDb();
    const allUsers = await db.select().from(users);

    return allUsers.map((user) => ({
      id: user.id,
      username: user.username,
      email: user.email,
      passwordHash: user.passwordHash,
      role: user.role as User["role"],
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }));
  }

  async createUser(input: CreateUserInput): Promise<User> {
    const db = await getDb();
    const passwordHash = await hashPassword(input.password);

    const [newUser] = await db
      .insert(users)
      .values({
        username: input.username,
        email: input.email || null,
        passwordHash,
        role: input.role,
      })
      .returning();

    return {
      id: newUser.id,
      username: newUser.username,
      email: newUser.email,
      passwordHash: newUser.passwordHash,
      role: newUser.role as User["role"],
      createdAt: newUser.createdAt,
      updatedAt: newUser.updatedAt,
    };
  }

  async updateUser(
    id: string,
    updates: Partial<Omit<User, "id" | "createdAt" | "passwordHash" | "updatedAt">>
  ): Promise<User> {
    const db = await getDb();
    const updateData: {
      username?: string;
      email?: string | null;
      role?: string;
      updatedAt: Date;
    } = {
      updatedAt: new Date(),
    };

    if (updates.username !== undefined) {
      updateData.username = updates.username;
    }
    if (updates.email !== undefined) {
      updateData.email = updates.email;
    }
    if (updates.role !== undefined) {
      updateData.role = updates.role;
    }

    const [updatedUser] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning();

    return {
      id: updatedUser.id,
      username: updatedUser.username,
      email: updatedUser.email,
      passwordHash: updatedUser.passwordHash,
      role: updatedUser.role as User["role"],
      createdAt: updatedUser.createdAt,
      updatedAt: updatedUser.updatedAt,
    };
  }

  async updateUserPassword(id: string, passwordHash: string): Promise<void> {
    const db = await getDb();
    await db
      .update(users)
      .set({
        passwordHash,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id));
  }

  async deleteUser(id: string): Promise<void> {
    const db = await getDb();
    await db.delete(users).where(eq(users.id, id));
  }
}
