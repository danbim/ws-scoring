import {
  BracketAlreadyExistsError,
  DivisionNotFoundError,
  InsufficientParticipantsError,
  TooManyParticipantsError,
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

/**
 * Interface for oRPC typed errors parameter.
 * Handlers and middleware receive this from the `.errors()` chain.
 */
interface OrpcErrors {
  NOT_FOUND: (opts?: { message?: string }) => Error;
  BAD_REQUEST: (opts?: { message?: string }) => Error;
}

// biome-ignore lint/suspicious/noExplicitAny: error constructors have varying signatures
type ErrorConstructor = new (...args: any[]) => Error;

/**
 * Domain errors that map to HTTP 404 NOT_FOUND.
 */
const NOT_FOUND_ERRORS: ReadonlyArray<ErrorConstructor> = [
  HeatDoesNotExistError,
  ScoreNotFoundError,
  DivisionNotFoundError,
];

/**
 * Domain errors that map to HTTP 400 BAD_REQUEST.
 */
const BAD_REQUEST_ERRORS: ReadonlyArray<ErrorConstructor> = [
  HeatAlreadyExistsError,
  HeatCompletedError,
  InvalidHeatRulesError,
  NonUniqueRiderIdsError,
  RiderAlreadyInHeatError,
  RiderNotInHeatError,
  ScoreMustBeInValidRangeError,
  ScoreTypeMismatchError,
  ScoreUUIDAlreadyExistsError,
  BracketAlreadyExistsError,
  InsufficientParticipantsError,
  TooManyParticipantsError,
];

/**
 * Maps a domain error to an oRPC typed error and throws it.
 * Replaces both `DOMAIN_ERROR_MAP` and `unwrapOrThrow`.
 *
 * @param error - The domain error from a Result.error
 * @param errors - The typed errors object from oRPC procedure/middleware
 * @throws Always throws the mapped oRPC error
 */
export function throwDomainError(error: Error, errors: OrpcErrors): never {
  for (const ErrorClass of NOT_FOUND_ERRORS) {
    if (error instanceof ErrorClass) {
      throw errors.NOT_FOUND({ message: error.message });
    }
  }

  for (const ErrorClass of BAD_REQUEST_ERRORS) {
    if (error instanceof ErrorClass) {
      throw errors.BAD_REQUEST({ message: error.message });
    }
  }

  // Fallback for unmapped domain errors
  throw errors.BAD_REQUEST({ message: error.message });
}
