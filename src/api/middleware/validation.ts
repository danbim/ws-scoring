// Validation middleware for API routes

import type { z } from "zod";
import { createErrorResponse } from "../helpers.js";

export async function withValidation<TSchema extends z.ZodType>(
  request: Request,
  schema: TSchema,
  handler: (validatedData: z.infer<TSchema>) => Promise<Response>
): Promise<Response> {
  try {
    const body = await request.json();
    const validationResult = schema.safeParse(body);

    if (!validationResult.success) {
      const errors = validationResult.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join(", ");
      return createErrorResponse(`Validation error: ${errors}`, 400);
    }

    return await handler(validationResult.data);
  } catch (error) {
    // Handle JSON parse errors
    if (error instanceof SyntaxError) {
      return createErrorResponse("Invalid JSON in request body", 400);
    }
    // Re-throw for upstream error handling
    throw error;
  }
}
