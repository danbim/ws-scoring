import { ORPCError, os } from "@orpc/server";
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

const authMiddleware = os.$context<BaseContext>().middleware(async ({ context, next }) => {
  const token = getSessionTokenFromCookie(context.request);
  if (!token) {
    throw new ORPCError("UNAUTHORIZED", { message: "Authentication required" });
  }

  const db = await getDb();
  const sessionRepository = createSessionRepository(db);
  const sessionWithUser = await sessionRepository.getSessionByToken(token);
  if (!sessionWithUser) {
    throw new ORPCError("UNAUTHORIZED", { message: "Invalid or expired session" });
  }

  return next({ context: { user: sessionWithUser.user } });
});

const adminMiddleware = os
  .$context<AuthenticatedContext>()
  .middleware(async ({ context, next }) => {
    if (context.user.role !== "administrator" && context.user.role !== "head_judge") {
      throw new ORPCError("FORBIDDEN", { message: "Insufficient permissions" });
    }
    return next({});
  });

export const publicProcedure = os.$context<BaseContext>().use(domainErrorMapper);
export const authedProcedure = publicProcedure.use(authMiddleware);
export const adminProcedure = authedProcedure.use(adminMiddleware);
