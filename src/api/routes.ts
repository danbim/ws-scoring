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
import { createHeatRepository } from "../infrastructure/repositories/index.js";
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
  updateHeatRequestSchema,
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
      bracketId: request.bracketId,
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

  // If this is a CreateHeat command, also persist to relational database
  if (command.type === "CreateHeat") {
    const heatRepository = createHeatRepository();
    try {
      await heatRepository.createHeat({
        heatId: command.data.heatId,
        bracketId: command.data.bracketId,
        riderIds: command.data.riderIds,
        wavesCounting: command.data.heatRules.wavesCounting,
        jumpsCounting: command.data.heatRules.jumpsCounting,
      });
    } catch (error) {
      console.error("Error persisting heat to relational database:", error);
      // Don't fail the request if relational DB write fails - event store is source of truth
    }
  }

  // TODO: Improve event broadcast latency and ensure reliability (#7)
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

export async function handleListHeats(bracketId?: string): Promise<Response> {
  try {
    const heatRepository = createHeatRepository();
    const heats = bracketId
      ? await heatRepository.getHeatsByBracketId(bracketId)
      : await heatRepository.getAllHeats();

    // Convert to API response format matching HeatState structure
    const heatResponses = heats.map((heat) => ({
      heatId: heat.heatId,
      riderIds: heat.riderIds,
      heatRules: {
        wavesCounting: heat.wavesCounting,
        jumpsCounting: heat.jumpsCounting,
      },
      scores: [], // Scores are only in event store, not in relational DB
      bracketId: heat.bracketId,
    }));

    return createSuccessResponse({ heats: heatResponses });
  } catch (error) {
    if (error instanceof Error) {
      return createErrorResponse(error.message, 500);
    }
    console.error("Unhandled error while processing request in handleListHeats:", error);
    return createErrorResponse("Internal server error", 500);
  }
}

export async function handleUpdateHeat(heatId: string, request: Request): Promise<Response> {
  try {
    const body = await request.json();
    const validationResult = updateHeatRequestSchema.safeParse(body);

    if (!validationResult.success) {
      const errors = validationResult.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join(", ");
      return createErrorResponse(`Validation error: ${errors}`, 400);
    }

    const data = validationResult.data;
    const heatRepository = createHeatRepository();

    const updates: {
      riderIds?: string[];
      wavesCounting?: number;
      jumpsCounting?: number;
    } = {};

    if (data.riderIds !== undefined) {
      updates.riderIds = data.riderIds;
    }
    if (data.heatRules !== undefined) {
      updates.wavesCounting = data.heatRules.wavesCounting;
      updates.jumpsCounting = data.heatRules.jumpsCounting;
    }

    const updatedHeat = await heatRepository.updateHeat(heatId, updates);

    return createSuccessResponse({
      heatId: updatedHeat.heatId,
      riderIds: updatedHeat.riderIds,
      heatRules: {
        wavesCounting: updatedHeat.wavesCounting,
        jumpsCounting: updatedHeat.jumpsCounting,
      },
      bracketId: updatedHeat.bracketId,
    });
  } catch (error) {
    if (error instanceof Error) {
      return createErrorResponse(error.message, 500);
    }
    console.error("Unhandled error while processing request in handleUpdateHeat:", error);
    return createErrorResponse("Internal server error", 500);
  }
}

export async function handleDeleteHeat(heatId: string): Promise<Response> {
  try {
    const heatRepository = createHeatRepository();
    await heatRepository.deleteHeat(heatId);

    return createSuccessResponse({ message: "Heat deleted successfully" });
  } catch (error) {
    if (error instanceof Error) {
      return createErrorResponse(error.message, 500);
    }
    console.error("Unhandled error while processing request in handleDeleteHeat:", error);
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
