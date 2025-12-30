import type { CreateUserInput, UserRole } from "./types.js";

export function hashPassword(password: string): Promise<string> {
  return Bun.password.hash(password);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return Bun.password.verify(password, hash);
}

export function validateUsername(username: string): boolean {
  return username.length >= 3 && username.length <= 50;
}

export function validatePassword(password: string): boolean {
  return password.length >= 8;
}

export function validateRole(role: string): role is UserRole {
  return role === "judge" || role === "head_judge" || role === "administrator";
}

export function validateUserInput(input: CreateUserInput): {
  valid: boolean;
  error?: string;
} {
  if (!validateUsername(input.username)) {
    return {
      valid: false,
      error: "Username must be between 3 and 50 characters",
    };
  }

  if (!validatePassword(input.password)) {
    return {
      valid: false,
      error: "Password must be at least 8 characters",
    };
  }

  if (!validateRole(input.role)) {
    return {
      valid: false,
      error: "Role must be one of: judge, head_judge, administrator",
    };
  }

  if (input.email && input.email.length > 255) {
    return {
      valid: false,
      error: "Email must be 255 characters or less",
    };
  }

  return { valid: true };
}
