import { ORPCError, os } from "@orpc/server";

/**
 * oRPC middleware safety net for unexpected errors.
 * Domain errors are handled explicitly via `throwDomainError()` in handlers.
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
