import type { SessionRepository, UserRepository } from "../../domain/user/repositories.js";
import { SESSION_DURATION_MS, SessionRepositoryImpl } from "./session-repository.js";
import { UserRepositoryImpl } from "./user-repository.js";

export function createUserRepository(): UserRepository {
  return new UserRepositoryImpl();
}

export function createSessionRepository(): SessionRepository {
  return new SessionRepositoryImpl();
}

export { SESSION_DURATION_MS };
