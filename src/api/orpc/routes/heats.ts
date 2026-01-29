import { ORPCError } from "@orpc/server";
import { z } from "zod";
import {
  buildHeatViewerState,
  calculateJumpTotal,
  calculateWaveTotal,
  getCountingJumpScores,
  getCountingWaveScores,
} from "../../../domain/heat/index.js";
import type { JumpModifier, JumpType, Score } from "../../../domain/heat/types.js";
import {
  createHeatRepository,
  createRiderRepository,
  createScoreRepository,
  createUserRepository,
} from "../../../infrastructure/repositories/index.js";
import { createHeatRequestSchema, updateHeatRequestSchema } from "../../schemas.js";
import { broadcastHeatUpdate } from "../../websocket.js";
import { broadcastHeadJudgeUpdate } from "../../websocket-head-judge.js";
import { adminProcedure, authedProcedure, publicProcedure } from "../context.js";

const scoreSchema = z.object({
  scoreUUID: z.string(),
  riderId: z.string(),
  judgeId: z.string(),
  type: z.enum(["wave", "jump"]),
  scoreValue: z.number(),
  jumpType: z.string().nullable(),
  modifiers: z.array(z.string()).nullable(),
  timestamp: z.date(),
});

const detailScoreSchema = scoreSchema.extend({
  isCounting: z.boolean(),
});

const heatListItemSchema = z.object({
  heatId: z.string(),
  position: z.string(),
  roundNumber: z.number(),
  roundName: z.string(),
  riderIds: z.array(z.string()),
  heatRules: z.object({
    wavesCounting: z.number(),
    jumpsCounting: z.number(),
  }),
  scores: z.array(scoreSchema),
  bracketId: z.string(),
  completedAt: z.date().nullable(),
});

const heatDetailSchema = heatListItemSchema.extend({
  scores: z.array(detailScoreSchema),
  riderTotals: z.record(z.string(), z.number()),
});

export const listHeats = authedProcedure
  .input(z.object({ bracketId: z.string().optional() }))
  .output(z.object({ heats: z.array(heatListItemSchema) }))
  .handler(async ({ input }) => {
    const heatRepository = createHeatRepository();
    const scoreRepository = createScoreRepository();

    const heats = input.bracketId
      ? await heatRepository.getHeatsByBracketId(input.bracketId)
      : await heatRepository.getAllHeats();

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
            type: s.type as "wave" | "jump",
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

    return { heats: heatResponses };
  });

export const getHeat = authedProcedure
  .input(z.object({ heatId: z.string() }))
  .output(heatDetailSchema)
  .handler(async ({ input, context }) => {
    const heatRepository = createHeatRepository();
    const scoreRepository = createScoreRepository();

    const heat = await heatRepository.getHeatByHeatId(input.heatId);
    if (!heat) {
      throw new ORPCError("NOT_FOUND", { message: "Heat not found" });
    }

    const dbScores = await scoreRepository.getScoresByHeatId(input.heatId);

    const domainScores: Score[] = dbScores.map((s) => {
      if (s.type === "wave") {
        return {
          type: "wave" as const,
          scoreUUID: s.scoreUuid,
          riderId: s.riderId,
          judgeId: s.judgeId,
          score: s.scoreValue,
          timestamp: s.timestamp,
        };
      }
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
    });

    const judgeId = context.user.id;
    const countingWaveScores = new Set<string>();
    const countingJumpScores = new Set<string>();

    for (const riderId of heat.riderIds) {
      for (const uuid of getCountingWaveScores(
        riderId,
        judgeId,
        domainScores,
        heat.wavesCounting
      )) {
        countingWaveScores.add(uuid);
      }
      for (const uuid of getCountingJumpScores(
        riderId,
        judgeId,
        domainScores,
        heat.jumpsCounting
      )) {
        countingJumpScores.add(uuid);
      }
    }

    const riderTotals: Record<string, number> = {};
    for (const riderId of heat.riderIds) {
      const waveTotal = calculateWaveTotal(riderId, judgeId, domainScores, heat.wavesCounting);
      const jumpTotal = calculateJumpTotal(riderId, judgeId, domainScores, heat.jumpsCounting);
      riderTotals[riderId] = waveTotal + jumpTotal;
    }

    return {
      heatId: heat.heatId,
      riderIds: heat.riderIds,
      heatRules: {
        wavesCounting: heat.wavesCounting,
        jumpsCounting: heat.jumpsCounting,
      },
      scores: dbScores.map((s) => ({
        scoreUUID: s.scoreUuid,
        riderId: s.riderId,
        judgeId: s.judgeId,
        type: s.type as "wave" | "jump",
        scoreValue: s.scoreValue,
        jumpType: s.jumpType,
        modifiers: s.jumpModifiers,
        timestamp: s.timestamp,
        isCounting:
          s.judgeId === judgeId &&
          (s.type === "wave"
            ? countingWaveScores.has(s.scoreUuid)
            : countingJumpScores.has(s.scoreUuid)),
      })),
      bracketId: heat.bracketId,
      position: heat.position,
      roundNumber: heat.roundNumber,
      roundName: heat.roundName,
      completedAt: heat.completedAt,
      riderTotals,
    };
  });

export const createHeat = authedProcedure
  .input(createHeatRequestSchema)
  .output(
    z.object({
      heatId: z.string(),
      riderIds: z.array(z.string()),
      heatRules: z.object({ wavesCounting: z.number(), jumpsCounting: z.number() }),
      bracketId: z.string(),
    })
  )
  .handler(async ({ input }) => {
    const heatRepository = createHeatRepository();

    const existingHeat = await heatRepository.getHeatByHeatId(input.heatId);
    if (existingHeat) {
      throw new ORPCError("BAD_REQUEST", { message: `Heat ${input.heatId} already exists` });
    }

    const heat = await heatRepository.createHeat({
      heatId: input.heatId,
      bracketId: input.bracketId,
      riderIds: input.riderIds,
      wavesCounting: input.heatRules.wavesCounting,
      jumpsCounting: input.heatRules.jumpsCounting,
      position: input.position,
      roundNumber: input.roundNumber,
      roundName: input.roundName,
    });

    await broadcastHeatUpdate(heat.heatId);

    return {
      heatId: heat.heatId,
      riderIds: heat.riderIds,
      heatRules: {
        wavesCounting: heat.wavesCounting,
        jumpsCounting: heat.jumpsCounting,
      },
      bracketId: heat.bracketId,
    };
  });

export const updateHeat = adminProcedure
  .input(z.object({ heatId: z.string(), data: updateHeatRequestSchema }))
  .output(
    z.object({
      heatId: z.string(),
      riderIds: z.array(z.string()),
      heatRules: z.object({ wavesCounting: z.number(), jumpsCounting: z.number() }),
      bracketId: z.string(),
    })
  )
  .handler(async ({ input }) => {
    const heatRepository = createHeatRepository();
    const updates: { riderIds?: string[]; wavesCounting?: number; jumpsCounting?: number } = {};

    if (input.data.riderIds !== undefined) updates.riderIds = input.data.riderIds;
    if (input.data.heatRules !== undefined) {
      updates.wavesCounting = input.data.heatRules.wavesCounting;
      updates.jumpsCounting = input.data.heatRules.jumpsCounting;
    }

    const updatedHeat = await heatRepository.updateHeat(input.heatId, updates);

    return {
      heatId: updatedHeat.heatId,
      riderIds: updatedHeat.riderIds,
      heatRules: {
        wavesCounting: updatedHeat.wavesCounting,
        jumpsCounting: updatedHeat.jumpsCounting,
      },
      bracketId: updatedHeat.bracketId,
    };
  });

export const deleteHeat = adminProcedure
  .input(z.object({ heatId: z.string() }))
  .output(z.object({ message: z.string() }))
  .handler(async ({ input }) => {
    const heatRepository = createHeatRepository();
    await heatRepository.deleteHeat(input.heatId);
    return { message: "Heat deleted successfully" };
  });

export const completeHeat = authedProcedure
  .input(z.object({ heatId: z.string() }))
  .output(z.object({ message: z.string() }))
  .handler(async ({ input }) => {
    const heatRepository = createHeatRepository();
    await heatRepository.completeHeat(input.heatId, new Date());

    await broadcastHeatUpdate(input.heatId);
    await broadcastHeadJudgeUpdate(input.heatId);

    return { message: "Heat completed successfully" };
  });

export const getViewer = publicProcedure
  .input(z.object({ heatId: z.string() }))
  .output(z.any())
  .handler(async ({ input }) => {
    const heatRepository = createHeatRepository();
    const scoreRepository = createScoreRepository();
    const riderRepository = createRiderRepository();

    const heat = await heatRepository.getHeatByHeatId(input.heatId);
    if (!heat) {
      throw new ORPCError("NOT_FOUND", { message: "Heat not found" });
    }

    const dbScores = await scoreRepository.getScoresByHeatId(input.heatId);

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
        }
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
      }),
      bracketId: heat.bracketId,
      position: heat.position,
      completedAt: heat.completedAt,
    };

    return await buildHeatViewerState(state, riderRepository);
  });

export const getHeadJudge = adminProcedure
  .input(z.object({ heatId: z.string() }))
  .output(z.any())
  .handler(async ({ input }) => {
    const heatRepository = createHeatRepository();
    const scoreRepository = createScoreRepository();
    const riderRepository = createRiderRepository();
    const userRepository = createUserRepository();

    const heat = await heatRepository.getHeatByHeatId(input.heatId);
    if (!heat) {
      throw new ORPCError("NOT_FOUND", { message: "Heat not found" });
    }

    const dbScores = await scoreRepository.getScoresByHeatId(input.heatId);

    const domainScores: Score[] = dbScores.map((s) => {
      if (s.type === "wave") {
        return {
          type: "wave" as const,
          scoreUUID: s.scoreUuid,
          riderId: s.riderId,
          judgeId: s.judgeId,
          score: s.scoreValue,
          timestamp: s.timestamp,
        };
      }
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
    });

    const judgeIds = Array.from(new Set(domainScores.map((s) => s.judgeId)));

    const judges = await Promise.all(
      judgeIds.map(async (judgeId) => {
        const user = await userRepository.getUserById(judgeId);
        const judgeScores = domainScores.filter((s) => s.judgeId === judgeId);

        const countingWaveScores = new Set<string>();
        const countingJumpScores = new Set<string>();

        for (const riderId of heat.riderIds) {
          for (const uuid of getCountingWaveScores(
            riderId,
            judgeId,
            domainScores,
            heat.wavesCounting
          )) {
            countingWaveScores.add(uuid);
          }
          for (const uuid of getCountingJumpScores(
            riderId,
            judgeId,
            domainScores,
            heat.jumpsCounting
          )) {
            countingJumpScores.add(uuid);
          }
        }

        const riderTotals: Record<string, number> = {};
        for (const riderId of heat.riderIds) {
          const waveTotal = calculateWaveTotal(riderId, judgeId, domainScores, heat.wavesCounting);
          const jumpTotal = calculateJumpTotal(riderId, judgeId, domainScores, heat.jumpsCounting);
          riderTotals[riderId] = waveTotal + jumpTotal;
        }

        return {
          judgeId,
          judgeName: user?.username || user?.email || "Unknown",
          scores: judgeScores.map((s) => ({
            scoreUUID: s.scoreUUID,
            riderId: s.riderId,
            type: s.type,
            scoreValue: s.score,
            jumpType: s.type === "jump" ? s.jumpType : null,
            modifiers: s.type === "jump" ? s.modifiers : null,
            timestamp: s.timestamp,
            isCounting:
              s.type === "wave"
                ? countingWaveScores.has(s.scoreUUID)
                : countingJumpScores.has(s.scoreUUID),
          })),
          riderTotals,
        };
      })
    );

    const riders = await Promise.all(
      heat.riderIds.map(async (riderId) => {
        const rider = await riderRepository.getRiderById(riderId);
        return {
          riderId,
          firstName: rider?.firstName || "Unknown",
          lastName: rider?.lastName || "",
          sailNumber: rider?.sailNumber || "N/A",
          country: rider?.country || "Unknown",
        };
      })
    );

    const averagedTotals: Record<string, number> = {};
    for (const riderId of heat.riderIds) {
      if (judges.length > 0) {
        const totalSum = judges.reduce((sum, judge) => sum + (judge.riderTotals[riderId] || 0), 0);
        averagedTotals[riderId] = totalSum / judges.length;
      } else {
        averagedTotals[riderId] = 0;
      }
    }

    return {
      heatId: heat.heatId,
      heatRules: {
        wavesCounting: heat.wavesCounting,
        jumpsCounting: heat.jumpsCounting,
      },
      riders,
      judges,
      averagedTotals,
      bracketId: heat.bracketId,
      position: heat.position,
      roundNumber: heat.roundNumber,
      roundName: heat.roundName,
      completedAt: heat.completedAt,
    };
  });
