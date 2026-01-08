// Score calculation business logic
import type { HeatState, JumpScore, Score } from "./types.js";

/**
 * Calculates the total wave score for a rider from a specific judge's scores.
 * @param riderId - The ID of the rider
 * @param judgeId - The ID of the judge
 * @param scores - All scores in the heat
 * @param wavesCounting - Number of best waves to count
 * @returns The sum of the top N wave scores from this judge
 */
export function calculateWaveTotal(
  riderId: string,
  judgeId: string,
  scores: Score[],
  wavesCounting: number
): number {
  const waveScores = scores
    .filter((s) => s.type === "wave" && s.riderId === riderId && s.judgeId === judgeId)
    .map((s) => s.score)
    .sort((a, b) => b - a) // Sort descending
    .slice(0, wavesCounting); // Take top N

  return waveScores.reduce((sum, score) => sum + score, 0);
}

/**
 * Calculates the total jump score for a rider from a specific judge's scores.
 * Only one jump per type is considered (the best of each type), then the top N
 * from that set are summed.
 * @param riderId - The ID of the rider
 * @param judgeId - The ID of the judge
 * @param scores - All scores in the heat
 * @param jumpsCounting - Number of best jumps to count
 * @returns The sum of the top N jump scores (one per type) from this judge
 */
export function calculateJumpTotal(
  riderId: string,
  judgeId: string,
  scores: Score[],
  jumpsCounting: number
): number {
  // Filter to only jump scores for this rider from this judge
  const riderJumps = scores.filter(
    (s): s is JumpScore => s.type === "jump" && s.riderId === riderId && s.judgeId === judgeId
  );

  return riderJumps
    .sort((a, b) => b.score - a.score)
    .reduce((bestJumps, jump) => {
      if (!bestJumps.some((b) => b.jumpType === jump.jumpType)) {
        bestJumps.push(jump);
      }
      return bestJumps;
    }, [] as JumpScore[])
    .slice(0, jumpsCounting)
    .reduce((sum, jump) => sum + jump.score, 0);
}

/**
 * Gets unique judge IDs from all scores in the heat.
 */
function getUniqueJudgeIds(scores: Score[]): string[] {
  const judgeIds = new Set<string>();
  for (const score of scores) {
    judgeIds.add(score.judgeId);
  }
  return Array.from(judgeIds);
}

/**
 * Calculates score totals for all riders in a heat with multi-judge averaging.
 * For each rider:
 * 1. Calculate each judge's total for this rider
 * 2. Average all judges' totals
 * @param heatState - The heat state containing riders, scores, and rules
 * @returns Array of rider totals sorted by total score (descending)
 */
export function calculateRiderScoreTotals(heatState: HeatState): Array<{
  riderId: string;
  waveTotal: number;
  jumpTotal: number;
  total: number;
}> {
  const judgeIds = getUniqueJudgeIds(heatState.scores);

  const riderTotals = heatState.riderIds.map((riderId) => {
    // If no judges have scored yet, return zeros
    if (judgeIds.length === 0) {
      return {
        riderId,
        waveTotal: 0,
        jumpTotal: 0,
        total: 0,
      };
    }

    // Calculate each judge's total for this rider
    const judgeTotals = judgeIds.map((judgeId) => {
      const waveTotal = calculateWaveTotal(
        riderId,
        judgeId,
        heatState.scores,
        heatState.heatRules.wavesCounting
      );
      const jumpTotal = calculateJumpTotal(
        riderId,
        judgeId,
        heatState.scores,
        heatState.heatRules.jumpsCounting
      );
      return waveTotal + jumpTotal;
    });

    // Average all judges' totals
    const averageTotal = judgeTotals.reduce((sum, t) => sum + t, 0) / judgeTotals.length;

    // For wave/jump breakdown, also average separately
    const waveAverage =
      judgeIds
        .map((judgeId) =>
          calculateWaveTotal(riderId, judgeId, heatState.scores, heatState.heatRules.wavesCounting)
        )
        .reduce((sum, t) => sum + t, 0) / judgeIds.length;

    const jumpAverage =
      judgeIds
        .map((judgeId) =>
          calculateJumpTotal(riderId, judgeId, heatState.scores, heatState.heatRules.jumpsCounting)
        )
        .reduce((sum, t) => sum + t, 0) / judgeIds.length;

    return {
      riderId,
      waveTotal: waveAverage,
      jumpTotal: jumpAverage,
      total: averageTotal,
    };
  });

  // Sort by total descending
  return riderTotals.sort((a, b) => b.total - a.total);
}
