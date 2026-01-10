// REST API route handlers

import { HeatService } from "../domain/heat/heat-service.js";
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
import type { JumpModifier, JumpType } from "../domain/heat/types.js";
import {
  createHeatRepository,
  createScoreRepository,
} from "../infrastructure/repositories/index.js";
import { createErrorResponse, createSuccessResponse } from "./helpers.js";
import {
  addJumpScoreRequestSchema,
  addWaveScoreRequestSchema,
  createHeatRequestSchema,
  updateHeatRequestSchema,
  updateJumpScoreRequestSchema,
  updateWaveScoreRequestSchema,
} from "./schemas.js";
import { broadcastHeatUpdate } from "./websocket.js";

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

// Helper to create HeatService instance
function createHeatService(): HeatService {
  return new HeatService(createHeatRepository(), createScoreRepository());
}

export async function handleCreateHeat(request: Request): Promise<Response> {
  try {
    const body = await request.json();
    const validationResult = createHeatRequestSchema.safeParse(body);

    if (!validationResult.success) {
      const errors = validationResult.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join(", ");
      return createErrorResponse(`Validation error: ${errors}`, 400);
    }

    const data = validationResult.data;
    const heatRepository = createHeatRepository();

    // Check if heat already exists
    const existingHeat = await heatRepository.getHeatByHeatId(data.heatId);
    if (existingHeat) {
      return createErrorResponse(`Heat ${data.heatId} already exists`, 400);
    }

    const heat = await heatRepository.createHeat({
      heatId: data.heatId,
      bracketId: data.bracketId,
      riderIds: data.riderIds,
      wavesCounting: data.heatRules.wavesCounting,
      jumpsCounting: data.heatRules.jumpsCounting,
      position: data.position,
      roundNumber: data.roundNumber,
      roundName: data.roundName,
    });

    // Broadcast heat creation
    await broadcastHeatUpdate(heat.heatId);

    return createSuccessResponse({
      heatId: heat.heatId,
      riderIds: heat.riderIds,
      heatRules: {
        wavesCounting: heat.wavesCounting,
        jumpsCounting: heat.jumpsCounting,
      },
      bracketId: heat.bracketId,
    });
  } catch (error) {
    if (isBadUserRequestError(error)) {
      return createErrorResponse(error.message, 400);
    }
    console.error("Unhandled error while processing request in handleCreateHeat:", error);
    return createErrorResponse("Internal server error", 500);
  }
}

export async function handleAddWaveScore(
  request: Request & { user: { id: string } }
): Promise<Response> {
  try {
    const body = await request.json();

    // Validate request with Zod schema
    const validationResult = addWaveScoreRequestSchema.safeParse(body);
    if (!validationResult.success) {
      const errors = validationResult.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join(", ");
      return createErrorResponse(`Validation error: ${errors}`, 400);
    }

    const data = validationResult.data;
    const heatService = createHeatService();

    // Add wave score using HeatService
    await heatService.addWaveScore(
      data.heatId,
      data.scoreUUID,
      data.riderId,
      request.user.id, // judgeId from authenticated user
      data.waveScore,
      new Date()
    );

    // Broadcast heat update
    await broadcastHeatUpdate(data.heatId);

    return createSuccessResponse({
      heatId: data.heatId,
      scoreUUID: data.scoreUUID,
      message: "Wave score added successfully",
    });
  } catch (error) {
    if (isBadUserRequestError(error)) {
      return createErrorResponse(error.message, 400);
    }
    console.error("Unhandled error while processing request in handleAddWaveScore:", error);
    return createErrorResponse("Internal server error", 500);
  }
}

export async function handleAddJumpScore(
  request: Request & { user: { id: string } }
): Promise<Response> {
  try {
    const body = await request.json();

    // Validate request with Zod schema
    const validationResult = addJumpScoreRequestSchema.safeParse(body);
    if (!validationResult.success) {
      const errors = validationResult.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join(", ");
      return createErrorResponse(`Validation error: ${errors}`, 400);
    }

    const data = validationResult.data;
    const heatService = createHeatService();

    // Add jump score using HeatService
    await heatService.addJumpScore(
      data.heatId,
      data.scoreUUID,
      data.riderId,
      request.user.id, // judgeId from authenticated user
      data.jumpScore,
      data.jumpType,
      data.modifiers,
      new Date()
    );

    // Broadcast heat update
    await broadcastHeatUpdate(data.heatId);

    return createSuccessResponse({
      heatId: data.heatId,
      scoreUUID: data.scoreUUID,
      message: "Jump score added successfully",
    });
  } catch (error) {
    if (isBadUserRequestError(error)) {
      return createErrorResponse(error.message, 400);
    }
    console.error("Unhandled error while processing request in handleAddJumpScore:", error);
    return createErrorResponse("Internal server error", 500);
  }
}

export async function handleGetHeat(heatId: string): Promise<Response> {
  try {
    const heatRepository = createHeatRepository();
    const scoreRepository = createScoreRepository();

    const heat = await heatRepository.getHeatByHeatId(heatId);
    if (!heat) {
      return createErrorResponse("Heat not found", 404);
    }

    const scores = await scoreRepository.getScoresByHeatId(heatId);

    // Format response to match expected structure
    const response = {
      heatId: heat.heatId,
      riderIds: heat.riderIds,
      heatRules: {
        wavesCounting: heat.wavesCounting,
        jumpsCounting: heat.jumpsCounting,
      },
      scores: scores.map((s) => ({
        scoreUUID: s.scoreUuid,
        riderId: s.riderId,
        judgeId: s.judgeId,
        type: s.type,
        scoreValue: s.scoreValue,
        jumpType: s.jumpType,
        modifiers: s.jumpModifiers,
        timestamp: s.timestamp,
      })),
      bracketId: heat.bracketId,
      position: heat.position,
      roundNumber: heat.roundNumber,
      roundName: heat.roundName,
      completedAt: heat.completedAt,
    };

    return createSuccessResponse(response);
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
    const scoreRepository = createScoreRepository();

    const heats = bracketId
      ? await heatRepository.getHeatsByBracketId(bracketId)
      : await heatRepository.getAllHeats();

    // Fetch scores for each heat and format response
    const heatResponses = await Promise.all(
      heats.map(async (heat) => {
        const scores = await scoreRepository.getScoresByHeatId(heat.heatId);

        return {
          heatId: heat.heatId,
          position: heat.position,
          roundNumber: heat.roundNumber,
          roundName: heat.roundName,
          riderIds: heat.riderIds,
          heatRules: {
            wavesCounting: heat.wavesCounting,
            jumpsCounting: heat.jumpsCounting,
          },
          scores: scores.map((s) => ({
            scoreUUID: s.scoreUuid,
            riderId: s.riderId,
            judgeId: s.judgeId,
            type: s.type,
            scoreValue: s.scoreValue,
            jumpType: s.jumpType,
            modifiers: s.jumpModifiers,
            timestamp: s.timestamp,
          })),
          bracketId: heat.bracketId,
          completedAt: heat.completedAt,
        };
      })
    );

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
    const heatRepository = createHeatRepository();
    const scoreRepository = createScoreRepository();

    const heat = await heatRepository.getHeatByHeatId(heatId);
    if (!heat) {
      return createErrorResponse("Heat not found", 404);
    }

    const dbScores = await scoreRepository.getScoresByHeatId(heatId);

    // Build HeatState compatible structure for buildHeatViewerState
    const state = {
      heatId: heat.heatId,
      riderIds: heat.riderIds,
      heatRules: {
        wavesCounting: heat.wavesCounting,
        jumpsCounting: heat.jumpsCounting,
      },
      scores: dbScores.map((s) => {
        if (s.type === "wave") {
          return {
            type: "wave" as const,
            scoreUUID: s.scoreUuid,
            riderId: s.riderId,
            judgeId: s.judgeId,
            score: s.scoreValue,
            timestamp: s.timestamp,
          };
        } else {
          return {
            type: "jump" as const,
            scoreUUID: s.scoreUuid,
            riderId: s.riderId,
            judgeId: s.judgeId,
            score: s.scoreValue,
            jumpType: s.jumpType as JumpType,
            modifiers: s.jumpModifiers as JumpModifier[],
            timestamp: s.timestamp,
          };
        }
      }),
      bracketId: heat.bracketId,
      position: heat.position,
      completedAt: heat.completedAt,
    };

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

export async function handleCompleteHeat(heatId: string, _request: Request): Promise<Response> {
  try {
    const heatRepository = createHeatRepository();
    await heatRepository.completeHeat(heatId, new Date());

    return createSuccessResponse({ message: "Heat completed successfully" });
  } catch (error) {
    if (isBadUserRequestError(error)) {
      return createErrorResponse(error.message, 400);
    }
    if (error instanceof Error) {
      return createErrorResponse(error.message, 500);
    }
    console.error("Unhandled error while processing request in handleCompleteHeat:", error);
    return createErrorResponse("Internal server error", 500);
  }
}

export async function handleUpdateWaveScore(
  heatId: string,
  scoreUUID: string,
  request: Request & { user: { id: string; role: string } }
): Promise<Response> {
  try {
    const body = await request.json();

    // Validate request with Zod schema
    const validationResult = updateWaveScoreRequestSchema.safeParse(body);
    if (!validationResult.success) {
      const errors = validationResult.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join(", ");
      return createErrorResponse(`Validation error: ${errors}`, 400);
    }

    const heatRepository = createHeatRepository();
    const scoreRepository = createScoreRepository();
    const heatService = createHeatService();

    // Get current heat to check if completed
    const heat = await heatRepository.getHeatByHeatId(heatId);
    if (!heat) {
      return createErrorResponse("Heat not found", 404);
    }

    // Check if heat is completed (locked)
    if (heat.completedAt !== null) {
      return createErrorResponse("Cannot update scores in a completed heat", 400);
    }

    // Find the score to update
    const existingScore = await scoreRepository.getScoreByUuid(scoreUUID);
    if (!existingScore) {
      return createErrorResponse("Score not found", 404);
    }

    // Authorization check: judges can only update their own scores
    // head_judge and administrator can update any score
    if (request.user.role === "judge" && existingScore.judgeId !== request.user.id) {
      return createErrorResponse("Forbidden: you can only update your own scores", 403);
    }

    // Update score using HeatService
    await heatService.updateWaveScore(scoreUUID, validationResult.data.waveScore);

    // Broadcast heat update
    await broadcastHeatUpdate(heatId);

    return createSuccessResponse({
      heatId,
      scoreUUID,
      message: "Wave score updated successfully",
    });
  } catch (error) {
    if (isBadUserRequestError(error)) {
      return createErrorResponse(error.message, 400);
    }
    console.error("Unhandled error while processing request in handleUpdateWaveScore:", error);
    return createErrorResponse("Internal server error", 500);
  }
}

export async function handleUpdateJumpScore(
  heatId: string,
  scoreUUID: string,
  request: Request & { user: { id: string; role: string } }
): Promise<Response> {
  try {
    const body = await request.json();

    // Validate request with Zod schema
    const validationResult = updateJumpScoreRequestSchema.safeParse(body);
    if (!validationResult.success) {
      const errors = validationResult.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join(", ");
      return createErrorResponse(`Validation error: ${errors}`, 400);
    }

    const heatRepository = createHeatRepository();
    const scoreRepository = createScoreRepository();
    const heatService = createHeatService();

    // Get current heat to check if completed
    const heat = await heatRepository.getHeatByHeatId(heatId);
    if (!heat) {
      return createErrorResponse("Heat not found", 404);
    }

    // Check if heat is completed (locked)
    if (heat.completedAt !== null) {
      return createErrorResponse("Cannot update scores in a completed heat", 400);
    }

    // Find the score to update
    const existingScore = await scoreRepository.getScoreByUuid(scoreUUID);
    if (!existingScore) {
      return createErrorResponse("Score not found", 404);
    }

    // Authorization check: judges can only update their own scores
    // head_judge and administrator can update any score
    if (request.user.role === "judge" && existingScore.judgeId !== request.user.id) {
      return createErrorResponse("Forbidden: you can only update your own scores", 403);
    }

    // Update score using HeatService
    await heatService.updateJumpScore(
      scoreUUID,
      validationResult.data.jumpScore,
      validationResult.data.jumpType,
      validationResult.data.modifiers
    );

    // Broadcast heat update
    await broadcastHeatUpdate(heatId);

    return createSuccessResponse({
      heatId,
      scoreUUID,
      message: "Jump score updated successfully",
    });
  } catch (error) {
    if (isBadUserRequestError(error)) {
      return createErrorResponse(error.message, 400);
    }
    console.error("Unhandled error while processing request in handleUpdateJumpScore:", error);
    return createErrorResponse("Internal server error", 500);
  }
}
