import type { CommonORPCErrorCode } from "@orpc/client";
import { ORPCError, os } from "@orpc/server";
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

// biome-ignore lint/suspicious/noExplicitAny: error constructors have varying signatures
type ErrorConstructor = new (...args: any[]) => Error;

/**
 * Maps domain error classes to oRPC error codes.
 * Shared by both `unwrapOrThrow` (for Result-based handlers) and
 * the `domainErrorMapper` middleware (safety net for unexpected errors).
 *
 * To add a new domain error:
 * 1. Create the error class in `domain/{entity}/errors.ts`
 * 2. Add one entry here: [ErrorClass, "STATUS_CODE"]
 */
export const DOMAIN_ERROR_MAP: Array<[ErrorConstructor, CommonORPCErrorCode]> = [
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
  [TooManyParticipantsError, "BAD_REQUEST"],

  // 404 NOT_FOUND — referenced entity doesn't exist
  [HeatDoesNotExistError, "NOT_FOUND"],
  [ScoreNotFoundError, "NOT_FOUND"],
  [DivisionNotFoundError, "NOT_FOUND"],
];

/**
 * oRPC middleware safety net for unexpected errors.
 * Domain errors are now handled explicitly via `unwrapOrThrow()` in handlers.
 * This middleware catches unexpected infrastructure errors (DB failures, etc.) → 500.
 */
export const domainErrorMapper = os.middleware(async ({ next }) => {
  try {
    return await next({});
  } catch (error) {
    if (error instanceof ORPCError) throw error;

    console.error("Unexpected error:", error);
    throw new ORPCError("INTERNAL_SERVER_ERROR", {
      message: error instanceof Error ? error.message : "Internal server error",
    });
  }
});
