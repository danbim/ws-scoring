import {
  calculateJumpTotal,
  calculateWaveTotal,
  getCountingJumpScores,
  getCountingWaveScores,
} from "../../domain/heat/index.js";
import type { JumpModifier, JumpType, Score } from "../../domain/heat/types.js";
import { getDb } from "../../infrastructure/db/index.js";
import {
  createHeatRepository,
  createRiderRepository,
  createScoreRepository,
  createUserRepository,
} from "../../infrastructure/repositories/index.js";
import { createErrorResponse, createSuccessResponse } from "../helpers.js";
import type { HeadJudgeState } from "../types.js";

export async function handleGetHeadJudgeHeat(
  heatId: string,
  request: Request & { user: { id: string; role: string } }
): Promise<Response> {
  try {
    // Authorization check
    if (request.user.role !== "head_judge" && request.user.role !== "administrator") {
      return createErrorResponse("Forbidden: head judge or administrator role required", 403);
    }

    const db = await getDb();
    const heatRepository = createHeatRepository(db);
    const scoreRepository = createScoreRepository(db);
    const riderRepository = createRiderRepository(db);
    const userRepository = createUserRepository(db);

    const heat = await heatRepository.getHeatByHeatId(heatId);
    if (!heat) {
      return createErrorResponse("Heat not found", 404);
    }

    const dbScores = await scoreRepository.getScoresByHeatId(heatId);

    // Convert database scores to domain Score format
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
    });

    // Get unique judge IDs
    const judgeIds = Array.from(new Set(domainScores.map((s) => s.judgeId)));

    // Fetch judge information
    const judges = await Promise.all(
      judgeIds.map(async (judgeId) => {
        const user = await userRepository.getUserById(judgeId);
        const judgeScores = domainScores.filter((s) => s.judgeId === judgeId);

        // Calculate counting scores for this judge
        const countingWaveScores = new Set<string>();
        const countingJumpScores = new Set<string>();

        for (const riderId of heat.riderIds) {
          const waveCounting = getCountingWaveScores(
            riderId,
            judgeId,
            domainScores,
            heat.wavesCounting
          );
          const jumpCounting = getCountingJumpScores(
            riderId,
            judgeId,
            domainScores,
            heat.jumpsCounting
          );

          waveCounting.forEach((uuid) => {
            countingWaveScores.add(uuid);
          });
          jumpCounting.forEach((uuid) => {
            countingJumpScores.add(uuid);
          });
        }

        // Calculate per-rider totals for this judge
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

    // Fetch rider information
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

    // Calculate averaged totals across all judges for each rider
    const averagedTotals: Record<string, number> = {};
    for (const riderId of heat.riderIds) {
      if (judges.length > 0) {
        const totalSum = judges.reduce((sum, judge) => {
          return sum + (judge.riderTotals[riderId] || 0);
        }, 0);
        averagedTotals[riderId] = totalSum / judges.length;
      } else {
        averagedTotals[riderId] = 0;
      }
    }

    const response: HeadJudgeState = {
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

    return createSuccessResponse(response);
  } catch (error) {
    if (error instanceof Error) {
      return createErrorResponse(error.message, 500);
    }
    console.error("Unhandled error in handleGetHeadJudgeHeat:", error);
    return createErrorResponse("Internal server error", 500);
  }
}
