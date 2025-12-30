import type { BunRequest } from "bun";
import type { PublicUser } from "../../domain/user";
import { createSessionRepository, SESSION_DURATION_MS } from "../../infrastructure/repositories";
import { createErrorResponse } from "../helpers.js";

// Allow dependency injection for testing
export const sessionRepository = createSessionRepository();

const SESSION_COOKIE_NAME = "session_token";

function getSecureFlag(): string {
  const isProduction = process.env.NODE_ENV === "production";
  return isProduction ? "Secure; " : "";
}

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
): Promise<{ user: PublicUser } | { error: Response }> {
  const token = await getSessionTokenFromRequest(request);

  if (!token) {
    return {
      error: createErrorResponse("Authentication required", 401),
    };
  }

  const sessionWithUser = await sessionRepository.getSessionByToken(token);

  if (!sessionWithUser) {
    return {
      error: createErrorResponse("Invalid or expired session", 401),
    };
  }

  return { user: sessionWithUser.user };
}

export function setSessionCookie(response: Response, token: string): void {
  const expires = new Date(Date.now() + SESSION_DURATION_MS);
  const secureFlag = getSecureFlag();
  response.headers.append(
    "Set-Cookie",
    `${SESSION_COOKIE_NAME}=${token}; HttpOnly; ${secureFlag}SameSite=Strict; Path=/; Expires=${expires.toUTCString()}`
  );
}

export function clearSessionCookie(response: Response): void {
  const secureFlag = getSecureFlag();
  response.headers.append(
    "Set-Cookie",
    `${SESSION_COOKIE_NAME}=; HttpOnly; ${secureFlag}SameSite=Strict; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT`
  );
}
