// Helper functions for API

import type { BunRequest } from "bun";
import type { PublicUser, UserRole } from "../domain/user/types.js";

export function createErrorResponse(message: string, status: number = 400): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export function createSuccessResponse(data: unknown, status: number = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function withAuth(
  request: BunRequest,
  handler: (request: BunRequest & { user: PublicUser }) => Promise<Response>
): Promise<Response> {
  const { authenticateRequest } = await import("./middleware/auth.js");
  const authResult = await authenticateRequest(request);

  if ("error" in authResult) {
    return authResult.error;
  }

  // Assign user property directly to preserve Request prototype chain
  (request as BunRequest & { user: PublicUser }).user = authResult.user;
  return handler(request as BunRequest & { user: PublicUser });
}

export async function withRoleAuth(
  request: BunRequest,
  allowedRoles: UserRole[],
  handler: (request: BunRequest & { user: PublicUser }) => Promise<Response>
): Promise<Response> {
  const { authenticateRequest } = await import("./middleware/auth.js");
  const authResult = await authenticateRequest(request);

  if ("error" in authResult) {
    return authResult.error;
  }

  if (!allowedRoles.includes(authResult.user.role)) {
    return createErrorResponse("Forbidden: insufficient permissions", 403);
  }

  // Assign user property directly to preserve Request prototype chain
  (request as BunRequest & { user: PublicUser }).user = authResult.user;
  return handler(request as BunRequest & { user: PublicUser });
}
