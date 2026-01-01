import type {
  BracketRepository,
  ContestRepository,
  DivisionRepository,
  SeasonRepository,
} from "../../domain/contest/repositories.js";
import type { SessionRepository, UserRepository } from "../../domain/user/repositories.js";
import { BracketRepositoryImpl } from "./bracket-repository.js";
import { ContestRepositoryImpl } from "./contest-repository.js";
import { DivisionRepositoryImpl } from "./division-repository.js";
import { SeasonRepositoryImpl } from "./season-repository.js";
import { SESSION_DURATION_MS, SessionRepositoryImpl } from "./session-repository.js";
import { UserRepositoryImpl } from "./user-repository.js";

export function createUserRepository(): UserRepository {
  return new UserRepositoryImpl();
}

export function createSessionRepository(): SessionRepository {
  return new SessionRepositoryImpl();
}

export function createSeasonRepository(): SeasonRepository {
  return new SeasonRepositoryImpl();
}

export function createContestRepository(): ContestRepository {
  return new ContestRepositoryImpl();
}

export function createDivisionRepository(): DivisionRepository {
  return new DivisionRepositoryImpl();
}

export function createBracketRepository(): BracketRepository {
  return new BracketRepositoryImpl();
}

export { SESSION_DURATION_MS };
