import { os } from "@orpc/server";
import type { ResponseHeadersPluginContext } from "@orpc/server/plugins";
import type { PublicUser } from "../../domain/user/types.js";
import { getDb } from "../../infrastructure/db/index.js";
import { createSessionRepository } from "../../infrastructure/repositories/index.js";
import { domainErrorMapper } from "./domain-error-mapper.js";

export interface BaseContext extends ResponseHeadersPluginContext {
  request: Request;
}

export interface AuthenticatedContext extends BaseContext {
  user: PublicUser;
}

const SESSION_COOKIE_NAME = "session_token";

function getSessionTokenFromCookie(request: Request): string | null {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) {
    return null;
  }

  const cookies = cookieHeader.split(";").reduce(
    (acc, cookie) => {
      const [key, value] = cookie.trim().split("=");
      if (key && value) {
        acc[key] = decodeURIComponent(value);
      }
      return acc;
    },
    {} as Record<string, string>
  );

  return cookies[SESSION_COOKIE_NAME] || null;
}

/**
 * Base procedure with common error types.
 * All procedures inherit NOT_FOUND and BAD_REQUEST for domain error mapping.
 */
const base = os.$context<BaseContext>().errors({
  NOT_FOUND: {},
  BAD_REQUEST: {},
});

/**
 * Authentication middleware with UNAUTHORIZED error.
 */
const authMiddleware = base
  .errors({ UNAUTHORIZED: {} })
  .middleware(async ({ context, next, errors }) => {
    const token = getSessionTokenFromCookie(context.request);
    if (!token) {
      throw errors.UNAUTHORIZED({ message: "Authentication required" });
    }

    const db = await getDb();
    const sessionRepository = createSessionRepository(db);
    const sessionWithUser = await sessionRepository.getSessionByToken(token);
    if (!sessionWithUser) {
      throw errors.UNAUTHORIZED({ message: "Invalid or expired session" });
    }

    return next({ context: { user: sessionWithUser.user } });
  });

/**
 * Admin authorization middleware with FORBIDDEN error.
 * Requires user to be administrator or head_judge.
 */
const adminMiddleware = os
  .$context<AuthenticatedContext>()
  .errors({ FORBIDDEN: {} })
  .middleware(async ({ context, next, errors }) => {
    if (context.user.role !== "administrator" && context.user.role !== "head_judge") {
      throw errors.FORBIDDEN({ message: "Insufficient permissions" });
    }
    return next({});
  });

export const publicProcedure = base.use(domainErrorMapper);
export const authedProcedure = publicProcedure.use(authMiddleware);
export const adminProcedure = authedProcedure.use(adminMiddleware);
