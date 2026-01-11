// Error handling middleware for API routes

import {
  BracketAlreadyExistsError,
  DivisionNotFoundError,
  InsufficientParticipantsError,
} from "../../domain/bracket/bracket-service.js";
import {
  HeatAlreadyExistsError,
  HeatDoesNotExistError,
  InvalidHeatRulesError,
  NonUniqueRiderIdsError,
  RiderAlreadyInHeatError,
  RiderNotInHeatError,
  ScoreMustBeInValidRangeError,
  ScoreUUIDAlreadyExistsError,
} from "../../domain/heat/errors.js";
import { createErrorResponse } from "../helpers.js";

// Type definitions for domain errors
export type HeatDomainError =
  | HeatAlreadyExistsError
  | HeatDoesNotExistError
  | NonUniqueRiderIdsError
  | RiderNotInHeatError
  | ScoreMustBeInValidRangeError
  | ScoreUUIDAlreadyExistsError
  | InvalidHeatRulesError
  | RiderAlreadyInHeatError;

export type BracketDomainError =
  | BracketAlreadyExistsError
  | DivisionNotFoundError
  | InsufficientParticipantsError;

export type DomainError = HeatDomainError | BracketDomainError;

// Type guards for domain errors
export function isHeatDomainError(error: unknown): error is HeatDomainError {
  return (
    error instanceof HeatAlreadyExistsError ||
    error instanceof HeatDoesNotExistError ||
    error instanceof NonUniqueRiderIdsError ||
    error instanceof RiderNotInHeatError ||
    error instanceof ScoreMustBeInValidRangeError ||
    error instanceof ScoreUUIDAlreadyExistsError ||
    error instanceof InvalidHeatRulesError ||
    error instanceof RiderAlreadyInHeatError
  );
}

export function isBracketDomainError(error: unknown): error is BracketDomainError {
  return (
    error instanceof BracketAlreadyExistsError ||
    error instanceof DivisionNotFoundError ||
    error instanceof InsufficientParticipantsError
  );
}

export function isDomainError(error: unknown): error is DomainError {
  return isHeatDomainError(error) || isBracketDomainError(error);
}

// Map domain errors to HTTP status codes
export function getDomainErrorStatusCode(error: Error): number {
  // 404 errors
  if (error instanceof DivisionNotFoundError) {
    return 404;
  }

  // All other domain errors are 400 (bad request)
  return 400;
}

// Error handling wrapper
export async function withErrorHandling(
  handler: () => Promise<Response>,
  context?: string
): Promise<Response> {
  try {
    return await handler();
  } catch (error) {
    // Domain errors (heat, bracket, etc.)
    if (isDomainError(error) && error instanceof Error) {
      const status = getDomainErrorStatusCode(error);
      return createErrorResponse(error.message, status);
    }

    // Generic errors
    if (error instanceof Error) {
      const logContext = context ? ` in ${context}` : "";
      console.error(`Unhandled error${logContext}:`, error);
      return createErrorResponse(error.message, 500);
    }

    // Unknown errors
    console.error(`Unknown error${context ? ` in ${context}` : ""}:`, error);
    return createErrorResponse("Internal server error", 500);
  }
}
