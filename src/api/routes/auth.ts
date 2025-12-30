import type { BunRequest } from "bun";
import { z } from "zod";
import { verifyPassword } from "../../domain/user/user-service.js";
import {
  createSessionRepository,
  createUserRepository,
} from "../../infrastructure/repositories/index.js";
import { createErrorResponse, createSuccessResponse } from "../helpers.js";
import {
  authenticateRequest,
  clearSessionCookie,
  getSessionTokenFromRequest,
  setSessionCookie,
} from "../middleware/auth.js";

// Allow dependency injection for testing
export const userRepository = createUserRepository();
export const sessionRepository = createSessionRepository();

const loginRequestSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export async function handleLogin(request: BunRequest): Promise<Response> {
  try {
    const body = await request.json();
    const validationResult = loginRequestSchema.safeParse(body);

    if (!validationResult.success) {
      const errors = validationResult.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join(", ");
      return createErrorResponse(`Validation error: ${errors}`, 400);
    }

    const { username, password } = validationResult.data;

    const user = await userRepository.getUserByUsername(username);

    if (!user) {
      return createErrorResponse("Invalid username or password", 401);
    }

    const isValidPassword = await verifyPassword(password, user.passwordHash);

    if (!isValidPassword) {
      return createErrorResponse("Invalid username or password", 401);
    }

    const session = await sessionRepository.createSession(user.id);

    const response = createSuccessResponse({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });

    setSessionCookie(response, session.token);
    return response;
  } catch (error) {
    console.error("Error in handleLogin:", error);
    return createErrorResponse("Internal server error", 500);
  }
}

export async function handleLogout(request: BunRequest): Promise<Response> {
  try {
    const token = await getSessionTokenFromRequest(request);

    if (token) {
      await sessionRepository.deleteSession(token);
    }

    const response = createSuccessResponse({ message: "Logged out successfully" });
    clearSessionCookie(response);
    return response;
  } catch (error) {
    console.error("Error in handleLogout:", error);
    return createErrorResponse("Internal server error", 500);
  }
}

export async function handleGetMe(request: BunRequest): Promise<Response> {
  try {
    const authResult = await authenticateRequest(request);

    if ("error" in authResult) {
      return authResult.error;
    }

    const { user } = authResult;

    return createSuccessResponse({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Error in handleGetMe:", error);
    return createErrorResponse("Internal server error", 500);
  }
}
