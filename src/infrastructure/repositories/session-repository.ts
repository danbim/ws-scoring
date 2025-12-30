import { and, eq, gt, lt } from "drizzle-orm";
import type { SessionRepository as ISessionRepository } from "../../domain/user/repositories.js";
import type { Session, User } from "../../domain/user/types.js";
import { getDb } from "../db/index.js";
import { sessions, users } from "../db/schema.js";

const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// Validate UUID format
function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

export class SessionRepositoryImpl implements ISessionRepository {
  async createSession(userId: string): Promise<Session> {
    const db = await getDb();
    const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

    const [session] = await db
      .insert(sessions)
      .values({
        userId,
        expiresAt,
      })
      .returning();

    return {
      id: session.id,
      userId: session.userId,
      token: session.token,
      expiresAt: session.expiresAt,
      createdAt: session.createdAt,
    };
  }

  async getSessionByToken(token: string): Promise<(Session & { user: User }) | null> {
    // Validate token format before querying database
    if (!isValidUUID(token)) {
      return null;
    }

    const db = await getDb();
    const now = new Date();

    const result = await db
      .select({
        session: sessions,
        user: users,
      })
      .from(sessions)
      .innerJoin(users, eq(sessions.userId, users.id))
      .where(and(eq(sessions.token, token), gt(sessions.expiresAt, now)))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    const { session, user } = result[0];

    return {
      id: session.id,
      userId: session.userId,
      token: session.token,
      expiresAt: session.expiresAt,
      createdAt: session.createdAt,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        passwordHash: user.passwordHash,
        role: user.role as User["role"],
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    };
  }

  async deleteSession(token: string): Promise<void> {
    // Validate token format before querying database
    if (!isValidUUID(token)) {
      return;
    }

    const db = await getDb();
    await db.delete(sessions).where(eq(sessions.token, token));
  }

  async deleteSessionsByUserId(userId: string): Promise<void> {
    const db = await getDb();
    await db.delete(sessions).where(eq(sessions.userId, userId));
  }

  async cleanupExpiredSessions(): Promise<void> {
    const db = await getDb();
    const now = new Date();
    await db.delete(sessions).where(lt(sessions.expiresAt, now));
  }
}
