import {
  DivisionNotFoundError,
  generateBracketForDivision,
} from "../../domain/bracket/bracket-service.js";
import { getDb } from "../../infrastructure/db/index.js";
import {
  createBracketRepository,
  createDivisionParticipantRepository,
  createDivisionRepository,
  createHeatRepository,
} from "../../infrastructure/repositories/index.js";
import { createErrorResponse, createSuccessResponse } from "../helpers.js";
import { generateBracketRequestSchema } from "../schemas.js";

export async function handleGenerateBracket(
  divisionId: string,
  request: Request
): Promise<Response> {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validationResult = generateBracketRequestSchema.safeParse(body);

    if (!validationResult.success) {
      const errors = validationResult.error.issues.map((e) => e.message).join(", ");
      return createErrorResponse(`Validation error: ${errors}`, 400);
    }

    // Create repositories within a transaction
    const db = await getDb();
    const result = await db.transaction(async (tx) => {
      return generateBracketForDivision(divisionId, {
        divisionRepository: createDivisionRepository(tx),
        bracketRepository: createBracketRepository(tx),
        divisionParticipantRepository: createDivisionParticipantRepository(tx),
        heatRepository: createHeatRepository(tx),
      });
    });

    if (result.isErr()) {
      const error = result.error;
      if (error instanceof DivisionNotFoundError) {
        return createErrorResponse(error.message, 404);
      }
      return createErrorResponse(error.message, 400);
    }

    return createSuccessResponse({ bracketId: result.value }, 201);
  } catch (error) {
    if (error instanceof Error) {
      return createErrorResponse(error.message, 500);
    }
    return createErrorResponse("Internal server error", 500);
  }
}

export async function handleGetBracketWithHeats(bracketId: string): Promise<Response> {
  try {
    const db = await getDb();
    const bracketRepository = createBracketRepository(db);
    const result = await bracketRepository.getBracketWithHeats(bracketId);

    if (!result) {
      return createErrorResponse("Bracket not found", 404);
    }

    return createSuccessResponse({
      bracket: {
        id: result.bracket.id,
        divisionId: result.bracket.divisionId,
        name: result.bracket.name,
        format: result.bracket.format,
        status: result.bracket.status,
        createdAt: result.bracket.createdAt.toISOString(),
        updatedAt: result.bracket.updatedAt.toISOString(),
      },
      rounds: result.rounds,
    });
  } catch (error) {
    console.error("Error getting bracket with heats:", error);
    return createErrorResponse("Internal server error", 500);
  }
}
