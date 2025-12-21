// Score calculation business logic
import type { HeatState, JumpScore, Score } from "./types.js";

/**
 * Calculates the total wave score for a rider by summing their top N wave scores.
 * @param riderId - The ID of the rider
 * @param scores - All scores in the heat
 * @param wavesCounting - Number of best waves to count
 * @returns The sum of the top N wave scores
 */
export function calculateWaveTotal(
  riderId: string,
  scores: Score[],
  wavesCounting: number
): number {
  const waveScores = scores
    .filter((s) => s.type === "wave" && s.riderId === riderId)
    .map((s) => s.score)
    .sort((a, b) => b - a) // Sort descending
    .slice(0, wavesCounting); // Take top N

  return waveScores.reduce((sum, score) => sum + score, 0);
}

/**
 * Calculates the total jump score for a rider by summing their top N jump scores.
 * Only one jump per type is considered (the best of each type), then the top N
 * from that set are summed.
 * @param riderId - The ID of the rider
 * @param scores - All scores in the heat
 * @param jumpsCounting - Number of best jumps to count
 * @returns The sum of the top N jump scores (one per type)
 */
export function calculateJumpTotal(
  riderId: string,
  scores: Score[],
  jumpsCounting: number
): number {
  // Filter to only jump scores for this rider
  const riderJumps = scores.filter(
    (s): s is JumpScore => s.type === "jump" && s.riderId === riderId
  );

  // Group by jumpType and find the best (highest-scoring) jump for each type
  const bestJumpPerType = new Map<string, JumpScore>();
  for (const jump of riderJumps) {
    const existing = bestJumpPerType.get(jump.jumpType);
    if (!existing || jump.score > existing.score) {
      bestJumpPerType.set(jump.jumpType, jump);
    }
  }

  // Sort the best jumps per type by score (descending) and take top N
  const topJumps = Array.from(bestJumpPerType.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, jumpsCounting);

  // Sum the top N scores
  return topJumps.reduce((sum, jump) => sum + jump.score, 0);
}

/**
 * Calculates score totals for all riders in a heat.
 * @param heatState - The heat state containing riders, scores, and rules
 * @returns Array of rider totals sorted by total score (descending)
 */
export function calculateRiderScoreTotals(heatState: HeatState): Array<{
  riderId: string;
  waveTotal: number;
  jumpTotal: number;
  total: number;
}> {
  const riderTotals = heatState.riderIds.map((riderId) => {
    const waveTotal = calculateWaveTotal(
      riderId,
      heatState.scores,
      heatState.heatRules.wavesCounting
    );
    const jumpTotal = calculateJumpTotal(
      riderId,
      heatState.scores,
      heatState.heatRules.jumpsCounting
    );
    const total = waveTotal + jumpTotal;

    return {
      riderId,
      waveTotal,
      jumpTotal,
      total,
    };
  });

  // Sort by total descending
  return riderTotals.sort((a, b) => b.total - a.total);
}
