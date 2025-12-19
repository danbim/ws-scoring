// REST API route handlers
import type { HeatCommand } from "../domain/heat/types.js";
import {
  aggregateHeatState,
  createErrorResponse,
  createSuccessResponse,
  handleCommand,
} from "./helpers.js";
import {
  addJumpScoreRequestSchema,
  addWaveScoreRequestSchema,
  createHeatRequestSchema,
} from "./schemas.js";
import { broadcastEvent } from "./websocket.js";

export async function handleCreateHeat(request: Request): Promise<Response> {
  try {
    const body = await request.json();

    // Validate request with Zod schema
    const validationResult = createHeatRequestSchema.safeParse(body);
    if (!validationResult.success) {
      const errors = validationResult.error.issues
        .map((e) => `${e.path.join(".")}: ${e.message}`)
        .join(", ");
      return createErrorResponse(`Validation error: ${errors}`, 400);
    }

    const validatedBody = validationResult.data;

    const command: HeatCommand = {
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

    const { events, heatId } = await handleCommand(command);

    // Broadcast events to WebSocket clients
    for (const event of events) {
      await broadcastEvent(heatId, event);
    }

    return createSuccessResponse({
      heatId,
      events: events.map((e) => ({ type: e.type, data: e.data })),
    });
  } catch (error) {
    if (error instanceof Error) {
      return createErrorResponse(error.message, 400);
    }
    return createErrorResponse("Internal server error", 500);
  }
}

export async function handleAddWaveScore(request: Request, heatId: string): Promise<Response> {
  try {
    const body = await request.json();

    // Validate request with Zod schema
    const validationResult = addWaveScoreRequestSchema.safeParse(body);
    if (!validationResult.success) {
      const errorMessages = validationResult.error.issues
        .map((e) => `${e.path.join(".")}: ${e.message}`)
        .join(", ");
      return createErrorResponse(`Validation error: ${errorMessages}`, 400);
    }

    const validatedBody = validationResult.data;

    // Generate server timestamp
    const timestamp = new Date();

    const command: HeatCommand = {
      type: "AddWaveScore",
      data: {
        heatId,
        scoreUUID: validatedBody.scoreUUID,
        riderId: validatedBody.riderId,
        waveScore: validatedBody.waveScore,
        timestamp,
      },
    };

    const { events, heatId: eventHeatId } = await handleCommand(command);

    // Broadcast events to WebSocket clients
    for (const event of events) {
      await broadcastEvent(eventHeatId, event);
    }

    return createSuccessResponse({
      heatId: eventHeatId,
      scoreUUID: validatedBody.scoreUUID,
      events: events.map((e) => ({ type: e.type, data: e.data })),
    });
  } catch (error) {
    if (error instanceof Error) {
      return createErrorResponse(error.message, 400);
    }
    return createErrorResponse("Internal server error", 500);
  }
}

export async function handleAddJumpScore(request: Request, heatId: string): Promise<Response> {
  try {
    const body = await request.json();

    // Validate request with Zod schema
    const validationResult = addJumpScoreRequestSchema.safeParse(body);
    if (!validationResult.success) {
      const errorMessages = validationResult.error.issues
        .map((e) => `${e.path.join(".")}: ${e.message}`)
        .join(", ");
      return createErrorResponse(`Validation error: ${errorMessages}`, 400);
    }

    const validatedBody = validationResult.data;

    // Generate server timestamp
    const timestamp = new Date();

    const command: HeatCommand = {
      type: "AddJumpScore",
      data: {
        heatId,
        scoreUUID: validatedBody.scoreUUID,
        riderId: validatedBody.riderId,
        jumpScore: validatedBody.jumpScore,
        jumpType: validatedBody.jumpType,
        timestamp,
      },
    };

    const { events, heatId: eventHeatId } = await handleCommand(command);

    // Broadcast events to WebSocket clients
    for (const event of events) {
      await broadcastEvent(eventHeatId, event);
    }

    return createSuccessResponse({
      heatId: eventHeatId,
      scoreUUID: validatedBody.scoreUUID,
      events: events.map((e) => ({ type: e.type, data: e.data })),
    });
  } catch (error) {
    if (error instanceof Error) {
      return createErrorResponse(error.message, 400);
    }
    return createErrorResponse("Internal server error", 500);
  }
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
