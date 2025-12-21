// Score calculation business logic
import type { HeatState, Score } from "./types.js";

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
 * @param riderId - The ID of the rider
 * @param scores - All scores in the heat
 * @param jumpsCounting - Number of best jumps to count
 * @returns The sum of the top N jump scores
 */
export function calculateJumpTotal(
  riderId: string,
  scores: Score[],
  jumpsCounting: number
): number {
  const jumpScores = scores
    .filter((s) => s.type === "jump" && s.riderId === riderId)
    .map((s) => s.score)
    .sort((a, b) => b - a) // Sort descending
    .slice(0, jumpsCounting); // Take top N

  return jumpScores.reduce((sum, score) => sum + score, 0);
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
