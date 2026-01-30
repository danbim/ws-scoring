import { ORPCError } from "@orpc/server";
import { z } from "zod";
import { HeatService } from "../../../domain/heat/heat-service.js";
import type { DbConnection } from "../../../infrastructure/db/index.js";
import { getDb } from "../../../infrastructure/db/index.js";
import {
  createHeatRepository,
  createScoreRepository,
} from "../../../infrastructure/repositories/index.js";
import {
  addJumpScoreRequestSchema,
  addWaveScoreRequestSchema,
  updateJumpScoreRequestSchema,
  updateWaveScoreRequestSchema,
} from "../../schemas.js";
import { broadcastHeatUpdate } from "../../websocket.js";
import { broadcastHeadJudgeUpdate } from "../../websocket-head-judge.js";
import { authedProcedure } from "../context.js";

function createHeatService(conn: DbConnection): HeatService {
  return new HeatService(createHeatRepository(conn), createScoreRepository(conn));
}

function canEditScore(userRole: string, scoreJudgeId: string, userId: string): boolean {
  if (userRole === "head_judge" || userRole === "administrator") {
    return true;
  }
  return scoreJudgeId === userId;
}

const scoreActionResponseSchema = z.object({
  heatId: z.string(),
  scoreUUID: z.string(),
  message: z.string(),
});

export const addWave = authedProcedure
  .input(addWaveScoreRequestSchema)
  .output(scoreActionResponseSchema)
  .handler(async ({ input, context }) => {
    const db = await getDb();
    const heatService = createHeatService(db);

    await heatService.addWaveScore(
      input.heatId,
      input.scoreUUID,
      input.riderId,
      context.user.id,
      input.waveScore,
      new Date()
    );

    await broadcastHeatUpdate(input.heatId);
    await broadcastHeadJudgeUpdate(input.heatId);

    return {
      heatId: input.heatId,
      scoreUUID: input.scoreUUID,
      message: "Wave score added successfully",
    };
  });

export const updateWave = authedProcedure
  .input(
    z.object({
      heatId: z.string(),
      scoreUUID: z.string(),
      data: updateWaveScoreRequestSchema,
    })
  )
  .output(scoreActionResponseSchema)
  .handler(async ({ input, context }) => {
    const db = await getDb();
    const scoreRepository = createScoreRepository(db);
    const heatService = createHeatService(db);

    const existingScore = await scoreRepository.getScoreByUuid(input.scoreUUID);
    if (!existingScore) {
      throw new ORPCError("NOT_FOUND", { message: "Score not found" });
    }

    if (!canEditScore(context.user.role, existingScore.judgeId, context.user.id)) {
      throw new ORPCError("FORBIDDEN", { message: "You can only update your own scores" });
    }

    await heatService.updateWaveScore(input.scoreUUID, input.data.waveScore);

    await broadcastHeatUpdate(input.heatId);
    await broadcastHeadJudgeUpdate(input.heatId);

    return {
      heatId: input.heatId,
      scoreUUID: input.scoreUUID,
      message: "Wave score updated successfully",
    };
  });

export const deleteWave = authedProcedure
  .input(z.object({ heatId: z.string(), scoreUUID: z.string() }))
  .output(scoreActionResponseSchema)
  .handler(async ({ input, context }) => {
    const db = await getDb();
    const scoreRepository = createScoreRepository(db);
    const heatService = createHeatService(db);

    const existingScore = await scoreRepository.getScoreByUuid(input.scoreUUID);
    if (!existingScore) {
      throw new ORPCError("NOT_FOUND", { message: "Score not found" });
    }

    if (existingScore.type !== "wave") {
      throw new ORPCError("BAD_REQUEST", { message: "Score is not a wave score" });
    }

    if (!canEditScore(context.user.role, existingScore.judgeId, context.user.id)) {
      throw new ORPCError("FORBIDDEN", { message: "You can only delete your own scores" });
    }

    await heatService.deleteScore(input.scoreUUID);

    await broadcastHeatUpdate(input.heatId);
    await broadcastHeadJudgeUpdate(input.heatId);

    return {
      heatId: input.heatId,
      scoreUUID: input.scoreUUID,
      message: "Wave score deleted successfully",
    };
  });

export const addJump = authedProcedure
  .input(addJumpScoreRequestSchema)
  .output(scoreActionResponseSchema)
  .handler(async ({ input, context }) => {
    const db = await getDb();
    const heatService = createHeatService(db);

    await heatService.addJumpScore(
      input.heatId,
      input.scoreUUID,
      input.riderId,
      context.user.id,
      input.jumpScore,
      input.jumpType,
      input.modifiers,
      new Date()
    );

    await broadcastHeatUpdate(input.heatId);
    await broadcastHeadJudgeUpdate(input.heatId);

    return {
      heatId: input.heatId,
      scoreUUID: input.scoreUUID,
      message: "Jump score added successfully",
    };
  });

export const updateJump = authedProcedure
  .input(
    z.object({
      heatId: z.string(),
      scoreUUID: z.string(),
      data: updateJumpScoreRequestSchema,
    })
  )
  .output(scoreActionResponseSchema)
  .handler(async ({ input, context }) => {
    const db = await getDb();
    const scoreRepository = createScoreRepository(db);
    const heatService = createHeatService(db);

    const existingScore = await scoreRepository.getScoreByUuid(input.scoreUUID);
    if (!existingScore) {
      throw new ORPCError("NOT_FOUND", { message: "Score not found" });
    }

    if (!canEditScore(context.user.role, existingScore.judgeId, context.user.id)) {
      throw new ORPCError("FORBIDDEN", { message: "You can only update your own scores" });
    }

    await heatService.updateJumpScore(
      input.scoreUUID,
      input.data.jumpScore,
      input.data.jumpType,
      input.data.modifiers
    );

    await broadcastHeatUpdate(input.heatId);
    await broadcastHeadJudgeUpdate(input.heatId);

    return {
      heatId: input.heatId,
      scoreUUID: input.scoreUUID,
      message: "Jump score updated successfully",
    };
  });

export const deleteJump = authedProcedure
  .input(z.object({ heatId: z.string(), scoreUUID: z.string() }))
  .output(scoreActionResponseSchema)
  .handler(async ({ input, context }) => {
    const db = await getDb();
    const scoreRepository = createScoreRepository(db);
    const heatService = createHeatService(db);

    const existingScore = await scoreRepository.getScoreByUuid(input.scoreUUID);
    if (!existingScore) {
      throw new ORPCError("NOT_FOUND", { message: "Score not found" });
    }

    if (existingScore.type !== "jump") {
      throw new ORPCError("BAD_REQUEST", { message: "Score is not a jump score" });
    }

    if (!canEditScore(context.user.role, existingScore.judgeId, context.user.id)) {
      throw new ORPCError("FORBIDDEN", { message: "You can only delete your own scores" });
    }

    await heatService.deleteScore(input.scoreUUID);

    await broadcastHeatUpdate(input.heatId);
    await broadcastHeadJudgeUpdate(input.heatId);

    return {
      heatId: input.heatId,
      scoreUUID: input.scoreUUID,
      message: "Jump score deleted successfully",
    };
  });
