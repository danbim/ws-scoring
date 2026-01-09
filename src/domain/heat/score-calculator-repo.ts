// Score calculation using repository Score types
import type { Score } from "./repositories.js";

export interface RiderScoreTotal {
  riderId: string;
  total: number;
}

/**
 * Calculates total scores for all riders in a heat.
 * @param scores - All scores from the repository
 * @param wavesCounting - Number of best waves to count
 * @param jumpsCounting - Number of best jumps to count
 * @returns Array of rider totals sorted by score (highest first)
 */
export function calculateRiderScoreTotals(
  scores: Score[],
  wavesCounting: number,
  jumpsCounting: number
): RiderScoreTotal[] {
  // Group scores by rider
  const riderScoresMap = new Map<string, Score[]>();

  for (const score of scores) {
    if (!riderScoresMap.has(score.riderId)) {
      riderScoresMap.set(score.riderId, []);
    }
    riderScoresMap.get(score.riderId)!.push(score);
  }

  // Calculate totals for each rider
  const riderTotals: RiderScoreTotal[] = [];

  for (const [riderId, riderScores] of riderScoresMap.entries()) {
    // Get wave scores
    const waveScores = riderScores
      .filter((s) => s.type === "wave")
      .map((s) => s.scoreValue)
      .sort((a, b) => b - a) // Sort descending
      .slice(0, wavesCounting); // Take top N

    const waveTotal = waveScores.reduce((sum, score) => sum + score, 0);

    // Get jump scores (best of each type, then take top N)
    const jumpsByType = new Map<string, number>();

    for (const score of riderScores) {
      if (score.type === "jump" && score.jumpType) {
        const current = jumpsByType.get(score.jumpType) ?? 0;
        if (score.scoreValue > current) {
          jumpsByType.set(score.jumpType, score.scoreValue);
        }
      }
    }

    const jumpScores = Array.from(jumpsByType.values())
      .sort((a, b) => b - a)
      .slice(0, jumpsCounting);

    const jumpTotal = jumpScores.reduce((sum, score) => sum + score, 0);

    riderTotals.push({
      riderId,
      total: waveTotal + jumpTotal,
    });
  }

  // Sort by total (highest first)
  return riderTotals.sort((a, b) => b.total - a.total);
}
