import type { CommonORPCErrorCode } from "@orpc/client";
import { ORPCError, os } from "@orpc/server";
import {
  BracketAlreadyExistsError,
  DivisionNotFoundError,
  InsufficientParticipantsError,
} from "../../domain/bracket/bracket-service.js";
import {
  HeatAlreadyExistsError,
  HeatCompletedError,
  HeatDoesNotExistError,
  InvalidHeatRulesError,
  NonUniqueRiderIdsError,
  RiderAlreadyInHeatError,
  RiderNotInHeatError,
  ScoreMustBeInValidRangeError,
  ScoreNotFoundError,
  ScoreTypeMismatchError,
  ScoreUUIDAlreadyExistsError,
} from "../../domain/heat/errors.js";

// biome-ignore lint/suspicious/noExplicitAny: error constructors have varying signatures
type ErrorConstructor = new (...args: any[]) => Error;

/**
 * Maps domain error classes to oRPC error codes.
 *
 * To add a new domain error:
 * 1. Create the error class in `domain/{entity}/errors.ts`
 * 2. Add one entry here: [ErrorClass, "STATUS_CODE"]
 */
const DOMAIN_ERROR_MAP: Array<[ErrorConstructor, CommonORPCErrorCode]> = [
  // 400 BAD_REQUEST — client violated a business rule
  [HeatAlreadyExistsError, "BAD_REQUEST"],
  [HeatCompletedError, "BAD_REQUEST"],
  [InvalidHeatRulesError, "BAD_REQUEST"],
  [NonUniqueRiderIdsError, "BAD_REQUEST"],
  [RiderAlreadyInHeatError, "BAD_REQUEST"],
  [RiderNotInHeatError, "BAD_REQUEST"],
  [ScoreMustBeInValidRangeError, "BAD_REQUEST"],
  [ScoreTypeMismatchError, "BAD_REQUEST"],
  [ScoreUUIDAlreadyExistsError, "BAD_REQUEST"],
  [BracketAlreadyExistsError, "BAD_REQUEST"],
  [InsufficientParticipantsError, "BAD_REQUEST"],

  // 404 NOT_FOUND — referenced entity doesn't exist
  [HeatDoesNotExistError, "NOT_FOUND"],
  [ScoreNotFoundError, "NOT_FOUND"],
  [DivisionNotFoundError, "NOT_FOUND"],
];

function mapDomainError(error: unknown): never {
  if (error instanceof ORPCError) throw error;

  if (error instanceof Error) {
    for (const [ErrorClass, code] of DOMAIN_ERROR_MAP) {
      if (error instanceof ErrorClass) {
        throw new ORPCError(code, { message: error.message });
      }
    }
  }

  throw error;
}

/**
 * oRPC middleware that maps domain errors to ORPCError.
 * Applied to base procedures so all routes get automatic error mapping.
 */
export const domainErrorMapper = os.middleware(async ({ next }) => {
  try {
    return await next({});
  } catch (error) {
    mapDomainError(error);
  }
});
