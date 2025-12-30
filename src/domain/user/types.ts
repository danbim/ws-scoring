export type UserRole = "judge" | "head_judge" | "administrator";

export interface User {
  id: string;
  username: string;
  email: string | null;
  passwordHash: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export type PublicUser = Omit<User, "passwordHash">;

export interface Session {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface CreateUserInput {
  username: string;
  email?: string | null;
  password: string;
  role: UserRole;
}
