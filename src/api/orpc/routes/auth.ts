import { ORPCError } from "@orpc/server";
import { deleteCookie, getCookie, setCookie } from "@orpc/server/helpers";
import { z } from "zod";
import { verifyPassword } from "../../../domain/user/user-service.js";
import { getDb } from "../../../infrastructure/db/index.js";
import {
  createSessionRepository,
  createUserRepository,
  SESSION_DURATION_MS,
} from "../../../infrastructure/repositories/index.js";
import { loginRequestSchema, userResponseSchema } from "../../schemas.js";
import { authedProcedure, publicProcedure } from "../context.js";

const SESSION_COOKIE_NAME = "session_token";
const isProduction = process.env.NODE_ENV === "production";

export const login = publicProcedure
  .input(loginRequestSchema)
  .output(z.object({ user: userResponseSchema }))
  .handler(async ({ input, context }) => {
    const db = await getDb();
    const userRepository = createUserRepository(db);
    const sessionRepository = createSessionRepository(db);

    const user = await userRepository.getUserByUsername(input.username);
    if (!user) {
      throw new ORPCError("UNAUTHORIZED", { message: "Invalid username or password" });
    }

    const isValidPassword = await verifyPassword(input.password, user.passwordHash);
    if (!isValidPassword) {
      throw new ORPCError("UNAUTHORIZED", { message: "Invalid username or password" });
    }

    const session = await sessionRepository.createSession(user.id);

    setCookie(context.resHeaders, SESSION_COOKIE_NAME, session.token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "strict",
      path: "/",
      maxAge: SESSION_DURATION_MS / 1000,
    });

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    };
  });

export const logout = authedProcedure
  .output(z.object({ message: z.string() }))
  .handler(async ({ context }) => {
    const db = await getDb();
    const sessionRepository = createSessionRepository(db);

    const token = getCookie(context.request.headers, SESSION_COOKIE_NAME);
    if (token) {
      await sessionRepository.deleteSession(token);
    }

    deleteCookie(context.resHeaders, SESSION_COOKIE_NAME, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "strict",
      path: "/",
    });

    return { message: "Logged out successfully" };
  });

export const me = authedProcedure
  .output(z.object({ user: userResponseSchema }))
  .handler(async ({ context }) => {
    return {
      user: {
        id: context.user.id,
        username: context.user.username,
        email: context.user.email,
        role: context.user.role,
      },
    };
  });
