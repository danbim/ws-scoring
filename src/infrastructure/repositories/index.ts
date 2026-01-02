import type {
  BracketRepository,
  ContestRepository,
  DivisionRepository,
  SeasonRepository,
} from "../../domain/contest/repositories.js";
import type { HeatRepository } from "../../domain/heat/repositories.js";
import type {
  DivisionParticipantRepository,
  RiderRepository,
} from "../../domain/rider/repositories.js";
import type { SessionRepository, UserRepository } from "../../domain/user/repositories.js";
import { BracketRepositoryImpl } from "./bracket-repository.js";
import { ContestRepositoryImpl } from "./contest-repository.js";
import { DivisionRepositoryImpl } from "./division-repository.js";
import { HeatRepositoryImpl } from "./heat-repository.js";
import { DivisionParticipantRepositoryImpl, RiderRepositoryImpl } from "./rider-repository.js";
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

export function createRiderRepository(): RiderRepository {
  return new RiderRepositoryImpl();
}

export function createDivisionParticipantRepository(): DivisionParticipantRepository {
  return new DivisionParticipantRepositoryImpl();
}

export function createHeatRepository(): HeatRepository {
  return new HeatRepositoryImpl();
}

export { SESSION_DURATION_MS };
