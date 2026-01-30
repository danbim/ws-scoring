import { eq } from "drizzle-orm";
import type { UserRepository } from "../../domain/user/repositories.js";
import type { CreateUserInput, User } from "../../domain/user/types.js";
import { hashPassword } from "../../domain/user/user-service.js";
import type { DbConnection } from "../db/index.js";
import { users } from "../db/schema.js";

export class UserRepositoryImpl implements UserRepository {
  constructor(private conn: DbConnection) {}

  private mapDbUserToUser(user: typeof users.$inferSelect): User {
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

  async getUserByUsername(username: string): Promise<User | null> {
    const [user] = await this.conn
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);

    if (!user) {
      return null;
    }

    return this.mapDbUserToUser(user);
  }

  async getUserById(id: string): Promise<User | null> {
    const [user] = await this.conn.select().from(users).where(eq(users.id, id)).limit(1);

    if (!user) {
      return null;
    }

    return this.mapDbUserToUser(user);
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const [user] = await this.conn.select().from(users).where(eq(users.email, email)).limit(1);

    if (!user) {
      return null;
    }

    return this.mapDbUserToUser(user);
  }

  async getAllUsers(): Promise<User[]> {
    const allUsers = await this.conn.select().from(users);

    return allUsers.map((user) => this.mapDbUserToUser(user));
  }

  async createUser(input: CreateUserInput): Promise<User> {
    const passwordHash = await hashPassword(input.password);

    const [newUser] = await this.conn
      .insert(users)
      .values({
        username: input.username,
        email: input.email || null,
        passwordHash,
        role: input.role,
      })
      .returning();

    return this.mapDbUserToUser(newUser);
  }

  async updateUser(
    id: string,
    updates: Partial<Omit<User, "id" | "createdAt" | "passwordHash" | "updatedAt">>
  ): Promise<User> {
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

    const [updatedUser] = await this.conn
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning();

    return this.mapDbUserToUser(updatedUser);
  }

  async updateUserPassword(id: string, passwordHash: string): Promise<void> {
    await this.conn
      .update(users)
      .set({
        passwordHash,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id));
  }

  async deleteUser(id: string): Promise<void> {
    await this.conn.delete(users).where(eq(users.id, id));
  }
}
