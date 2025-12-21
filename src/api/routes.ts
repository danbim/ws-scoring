// REST API route handlers

import type z from "zod";
import {
  type BadUserRequestError,
  buildHeatViewerState,
  HeatAlreadyExistsError,
  HeatDoesNotExistError,
  InvalidHeatRulesError,
  NonUniqueRiderIdsError,
  RiderNotInHeatError,
  ScoreMustBeInValidRangeError,
  ScoreUUIDAlreadyExistsError,
} from "../domain/heat/index.js";
import type { AddJumpScore, AddWaveScore, HeatCommand } from "../domain/heat/types.js";
import {
  aggregateHeatState,
  createErrorResponse,
  createSuccessResponse,
  handleCommand,
} from "./helpers.js";
import {
  type AddJumpScoreRequest,
  type AddWaveScoreRequest,
  addJumpScoreRequestSchema,
  addWaveScoreRequestSchema,
  type CreateHeatRequest,
  createHeatRequestSchema,
} from "./schemas.js";
import { broadcastEvent } from "./websocket.js";

function isBadUserRequestError(error: unknown): error is BadUserRequestError {
  return (
    error instanceof HeatAlreadyExistsError ||
    error instanceof HeatDoesNotExistError ||
    error instanceof NonUniqueRiderIdsError ||
    error instanceof RiderNotInHeatError ||
    error instanceof ScoreMustBeInValidRangeError ||
    error instanceof ScoreUUIDAlreadyExistsError ||
    error instanceof InvalidHeatRulesError
  );
}

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

    const command = toCommand(validationResult.data);
    return await handler(command);
  } catch (error) {
    if (isBadUserRequestError(error)) {
      return createErrorResponse(error.message, 400);
    }
    console.error("Unhandled error while processing request in withValidatedRequestBody:", error);
    return createErrorResponse("Internal server error", 500);
  }
}

function toCreateHeatCommand(request: CreateHeatRequest): HeatCommand {
  return {
    type: "CreateHeat",
    data: {
      heatId: request.heatId,
      riderIds: request.riderIds,
      heatRules: {
        wavesCounting: request.heatRules.wavesCounting,
        jumpsCounting: request.heatRules.jumpsCounting,
      },
    },
  };
}

function toAddWaveScoreCommand(request: AddWaveScoreRequest): AddWaveScore {
  return {
    type: "AddWaveScore",
    data: {
      heatId: request.heatId,
      scoreUUID: request.scoreUUID,
      riderId: request.riderId,
      waveScore: request.waveScore,
      timestamp: new Date(),
    },
  };
}

function toAddJumpScoreCommand(request: AddJumpScoreRequest): AddJumpScore {
  return {
    type: "AddJumpScore",
    data: {
      heatId: request.heatId,
      scoreUUID: request.scoreUUID,
      riderId: request.riderId,
      jumpScore: request.jumpScore,
      jumpType: request.jumpType,
      timestamp: new Date(),
    },
  };
}

async function processCommand(command: HeatCommand): Promise<Response> {
  const heatId = command.data.heatId;
  const events = await handleCommand(command);

  // TODO: this probably is not super reliable and produces latency. find a better way to do this.
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
  return withValidatedRequestBody(
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
    console.error("Unhandled error while processing request in handleGetHeat:", error);
    return createErrorResponse("Internal server error", 500);
  }
}

export async function handleListHeats(): Promise<Response> {
  try {
    // For the in-memory event store, we don't have a direct way to list all heats.
    // This means this endpoint currently *always* returns an empty list of heats.
    //
    // TODO: In a production environment, replace the in-memory store or augment it
    // with a persistent index/registry of heat IDs so that this endpoint can return
    // the actual list of heats instead of an empty array.
    //
    // Until that is implemented, API clients should treat this endpoint as a
    // "no-op" listing endpoint that does not reflect existing heats.
    return createSuccessResponse({ heats: [] });
  } catch (error) {
    if (error instanceof Error) {
      return createErrorResponse(error.message, 500);
    }
    console.error("Unhandled error while processing request in handleListHeats:", error);
    return createErrorResponse("Internal server error", 500);
  }
}

export async function handleGetHeatViewer(heatId: string): Promise<Response> {
  try {
    const state = await aggregateHeatState(heatId);

    if (state === null) {
      return createErrorResponse("Heat not found", 404);
    }

    const viewerState = buildHeatViewerState(state);
    return createSuccessResponse(viewerState);
  } catch (error) {
    if (error instanceof Error) {
      return createErrorResponse(error.message, 500);
    }
    console.error("Unhandled error while processing request in handleGetHeatViewer:", error);
    return createErrorResponse("Internal server error", 500);
  }
}
