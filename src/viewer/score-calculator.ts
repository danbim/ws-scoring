// Score calculation utilities
import type { HeatState, Score } from "../domain/heat/types.js";

export interface RiderTotal {
  riderId: string;
  waveTotal: number;
  jumpTotal: number;
  total: number;
}

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

export function calculateRiderTotals(heatState: HeatState): RiderTotal[] {
  const riderTotals: RiderTotal[] = heatState.riderIds.map((riderId) => {
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
