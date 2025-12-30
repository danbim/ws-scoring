import type { CreateUserInput, Session, User } from "./types.js";

export interface UserRepository {
  getUserByUsername(username: string): Promise<User | null>;
  getUserById(id: string): Promise<User | null>;
  getUserByEmail(email: string): Promise<User | null>;
  getAllUsers(): Promise<User[]>;
  createUser(input: CreateUserInput): Promise<User>;
  updateUser(id: string, updates: Partial<Omit<User, "id" | "createdAt">>): Promise<User>;
  updateUserPassword(id: string, passwordHash: string): Promise<void>;
  deleteUser(id: string): Promise<void>;
}

export interface SessionRepository {
  createSession(userId: string): Promise<Session>;
  getSessionByToken(token: string): Promise<(Session & { user: User }) | null>;
  deleteSession(token: string): Promise<void>;
  deleteSessionsByUserId(userId: string): Promise<void>;
  cleanupExpiredSessions(): Promise<void>;
}
