import { ORPCError } from "@orpc/server";
import type { Result } from "neverthrow";
import { DOMAIN_ERROR_MAP } from "./domain-error-mapper.js";

/**
 * Unwraps a Result, returning the value on success or throwing an ORPCError on failure.
 * Used at the API boundary where oRPC needs thrown errors for non-2xx responses.
 */
export function unwrapOrThrow<T>(result: Result<T, Error>): T {
  if (result.isOk()) return result.value;

  const error = result.error;
  for (const [ErrorClass, code] of DOMAIN_ERROR_MAP) {
    if (error instanceof ErrorClass) {
      throw new ORPCError(code, { message: error.message });
    }
  }

  throw new ORPCError("INTERNAL_SERVER_ERROR", { message: error.message });
}
