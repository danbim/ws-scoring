import type {
  BracketRepository,
  ContestRepository,
  DivisionRepository,
  SeasonRepository,
} from "../../domain/contest/repositories.js";
import type { HeatRepository, ScoreRepository } from "../../domain/heat/repositories.js";
import type {
  DivisionParticipantRepository,
  RiderRepository,
} from "../../domain/rider/repositories.js";
import type { SessionRepository, UserRepository } from "../../domain/user/repositories.js";
import type { DbConnection } from "../db/index.js";
import { BracketRepositoryImpl } from "./bracket-repository.js";
import { ContestRepositoryImpl } from "./contest-repository.js";
import { DivisionRepositoryImpl } from "./division-repository.js";
import { HeatRepositoryImpl } from "./heat-repository.js";
import { DivisionParticipantRepositoryImpl, RiderRepositoryImpl } from "./rider-repository.js";
import { ScoreRepositoryImpl } from "./score-repository.js";
import { SeasonRepositoryImpl } from "./season-repository.js";
import { SESSION_DURATION_MS, SessionRepositoryImpl } from "./session-repository.js";
import { UserRepositoryImpl } from "./user-repository.js";

export function createUserRepository(conn: DbConnection): UserRepository {
  return new UserRepositoryImpl(conn);
}

export function createSessionRepository(conn: DbConnection): SessionRepository {
  return new SessionRepositoryImpl(conn);
}

export function createSeasonRepository(conn: DbConnection): SeasonRepository {
  return new SeasonRepositoryImpl(conn);
}

export function createContestRepository(conn: DbConnection): ContestRepository {
  return new ContestRepositoryImpl(conn);
}

export function createDivisionRepository(conn: DbConnection): DivisionRepository {
  return new DivisionRepositoryImpl(conn);
}

export function createBracketRepository(conn: DbConnection): BracketRepository {
  return new BracketRepositoryImpl(conn);
}

export function createRiderRepository(conn: DbConnection): RiderRepository {
  return new RiderRepositoryImpl(conn);
}

export function createDivisionParticipantRepository(conn: DbConnection): DivisionParticipantRepository {
  return new DivisionParticipantRepositoryImpl(conn);
}

export function createHeatRepository(conn: DbConnection): HeatRepository {
  return new HeatRepositoryImpl(conn);
}

export function createScoreRepository(conn: DbConnection): ScoreRepository {
  return new ScoreRepositoryImpl(conn);
}

export { SESSION_DURATION_MS };
