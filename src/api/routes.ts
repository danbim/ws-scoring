// REST API route handlers
import type { ZodIssue } from "zod/v3";
import type { AddJumpScore, AddWaveScore, HeatCommand } from "../domain/heat/types.js";
import {
  aggregateHeatState,
  createErrorResponse,
  createSuccessResponse,
  handleCommand,
} from "./helpers.js";
import {
  AddJumpScoreRequest,
  addJumpScoreRequestSchema,
  AddWaveScoreRequest,
  addWaveScoreRequestSchema,
  CreateHeatRequest,
  createHeatRequestSchema,
} from "./schemas.js";
import { broadcastEvent } from "./websocket.js";
import type z from "zod";

async function withValidatedRequestBody<T>(
  request: Request,
  schema: z.ZodSchema<T>,
  toCommand: (validatedBody: T) => HeatCommand,
  handler: (validatedBody: HeatCommand) => Promise<Response>
): Promise<Response> {
  try {
    const body = await request.json();

    // Validate request with Zod schema
    const validationResult = schema.safeParse(body);
    if (!validationResult.success) {
      const errors = validationResult.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join(", ");
      return createErrorResponse(`Validation error: ${errors}`, 400);
    }

    return handler(toCommand(validationResult.data));
  } catch (error) {
    if (error instanceof Error) {
      return createErrorResponse(error.message, 400);
    }
    return createErrorResponse("Internal server error", 500);
  }
}

function toCreateHeatCommand(validatedBody: CreateHeatRequest): HeatCommand {
  return {
    type: "CreateHeat",
    data: {
      heatId: validatedBody.heatId,
      riderIds: validatedBody.riderIds,
      heatRules: {
        wavesCounting: validatedBody.heatRules.wavesCounting,
        jumpsCounting: validatedBody.heatRules.jumpsCounting,
      },
    },
  };
}

function toAddWaveScoreCommand(validatedBody: AddWaveScoreRequest): AddWaveScore {
  return {
    type: "AddWaveScore",
    data: {
      heatId: validatedBody.heatId,
      scoreUUID: validatedBody.scoreUUID,
      riderId: validatedBody.riderId,
      waveScore: validatedBody.waveScore,
      timestamp: new Date(),
    },
  };
}

function toAddJumpScoreCommand(validatedBody: AddJumpScoreRequest): AddJumpScore {
  return {
    type: "AddJumpScore",
    data: {
      heatId: validatedBody.heatId,
      scoreUUID: validatedBody.scoreUUID,
      riderId: validatedBody.riderId,
      jumpScore: validatedBody.jumpScore,
      jumpType: validatedBody.jumpType,
      timestamp: new Date(),
    },
  };
}

async function processCommand(command: HeatCommand): Promise<Response> {
  const { events, heatId } = await handleCommand(command);

  // Broadcast events to WebSocket clients
  for (const event of events) {
    await broadcastEvent(heatId, event);
  }

  return createSuccessResponse({
    heatId,
    events: events.map((e) => ({ type: e.type, data: e.data })),
  });
}

export async function handleCreateHeat(request: Request): Promise<Response> {
  return withValidatedRequestBody<CreateHeatRequest>(
    request,
    createHeatRequestSchema,
    toCreateHeatCommand,
    processCommand
  );
}

export async function handleAddWaveScore(request: Request): Promise<Response> {
  return withValidatedRequestBody(
    request,
    addWaveScoreRequestSchema,
    toAddWaveScoreCommand,
    processCommand
  );
}

export async function handleAddJumpScore(request: Request): Promise<Response> {
  return withValidatedRequestBody(
    request,
    addJumpScoreRequestSchema,
    toAddJumpScoreCommand,
    processCommand
  );
}

export async function handleGetHeat(heatId: string): Promise<Response> {
  try {
    const state = await aggregateHeatState(heatId);

    if (state === null) {
      return createErrorResponse("Heat not found", 404);
    }

    return createSuccessResponse(state);
  } catch (error) {
    if (error instanceof Error) {
      return createErrorResponse(error.message, 500);
    }
    return createErrorResponse("Internal server error", 500);
  }
}

export async function handleListHeats(): Promise<Response> {
  try {
    // For in-memory event store, we don't have a direct way to list all heats
    // This is a limitation - in production, you'd maintain a separate index
    // For now, return an empty array or implement a simple tracking mechanism

    // Since we can't easily list all heats with the in-memory store,
    // we'll return an empty array for now
    // In a production system, you'd maintain a registry of heat IDs
    return createSuccessResponse({ heats: [] });
  } catch (error) {
    if (error instanceof Error) {
      return createErrorResponse(error.message, 500);
    }
    return createErrorResponse("Internal server error", 500);
  }
}
