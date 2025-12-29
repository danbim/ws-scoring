import type { BunRequest } from "bun";
import type { User } from "../../domain/user/types.js";
import { getSessionByToken } from "../../infrastructure/session-store.js";
import { createErrorResponse } from "../helpers.js";

const SESSION_COOKIE_NAME = "session_token";

export async function getSessionTokenFromRequest(request: BunRequest): Promise<string | null> {
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

export async function authenticateRequest(
  request: BunRequest
): Promise<{ user: User } | { error: Response }> {
  const token = await getSessionTokenFromRequest(request);

  if (!token) {
    return {
      error: createErrorResponse("Authentication required", 401),
    };
  }

  const sessionWithUser = await getSessionByToken(token);

  if (!sessionWithUser) {
    return {
      error: createErrorResponse("Invalid or expired session", 401),
    };
  }

  return { user: sessionWithUser.user };
}

export function setSessionCookie(response: Response, token: string): void {
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  response.headers.append(
    "Set-Cookie",
    `${SESSION_COOKIE_NAME}=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Expires=${expires.toUTCString()}`
  );
}

export function clearSessionCookie(response: Response): void {
  response.headers.append(
    "Set-Cookie",
    `${SESSION_COOKIE_NAME}=; HttpOnly; Secure; SameSite=Strict; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT`
  );
}
