import { describe, expect, it } from "bun:test";
import type { Score } from "../../../src/domain/heat/repositories.js";
import { calculateRiderScoreTotals } from "../../../src/domain/heat/score-calculator-repo.js";

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

let scoreIdCounter = 0;

function createScore(overrides: Partial<Score> = {}): Score {
  scoreIdCounter += 1;
  return {
    id: `db-id-${scoreIdCounter}`,
    scoreUuid: `score-uuid-${scoreIdCounter}`,
    heatId: "heat-1",
    riderId: "rider-1",
    judgeId: "judge-1",
    type: "wave",
    scoreValue: 5.0,
    jumpType: null,
    jumpModifiers: null,
    timestamp: new Date("2025-01-01T10:00:00Z"),
    createdAt: new Date("2025-01-01T10:00:00Z"),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("calculateRiderScoreTotals", () => {
  it("should return empty array when scores is empty", () => {
    const result = calculateRiderScoreTotals([], 3, 2);
    expect(result).toEqual([]);
  });

  it("should take top N wave scores per rider", () => {
    // rider-1 has 4 wave scores: 9, 8, 7, 6 -> top 2 = 9 + 8 = 17
    const scores: Score[] = [
      createScore({ riderId: "rider-1", type: "wave", scoreValue: 6 }),
      createScore({ riderId: "rider-1", type: "wave", scoreValue: 9 }),
      createScore({ riderId: "rider-1", type: "wave", scoreValue: 7 }),
      createScore({ riderId: "rider-1", type: "wave", scoreValue: 8 }),
    ];

    const result = calculateRiderScoreTotals(scores, 2, 0);

    expect(result).toHaveLength(1);
    expect(result[0].riderId).toBe("rider-1");
    expect(result[0].total).toBe(17); // 9 + 8
  });

  it("should take best score per jump type, then top N", () => {
    // rider-1 has:
    //   forward: 8, 6 -> best = 8
    //   backloop: 7, 5 -> best = 7
    //   pushLoop: 4      -> best = 4
    // jumpsCounting = 2 -> top 2 jump types: 8 + 7 = 15
    const scores: Score[] = [
      createScore({
        riderId: "rider-1",
        type: "jump",
        scoreValue: 8,
        jumpType: "forward",
      }),
      createScore({
        riderId: "rider-1",
        type: "jump",
        scoreValue: 6,
        jumpType: "forward",
      }),
      createScore({
        riderId: "rider-1",
        type: "jump",
        scoreValue: 7,
        jumpType: "backloop",
      }),
      createScore({
        riderId: "rider-1",
        type: "jump",
        scoreValue: 5,
        jumpType: "backloop",
      }),
      createScore({
        riderId: "rider-1",
        type: "jump",
        scoreValue: 4,
        jumpType: "pushLoop",
      }),
    ];

    const result = calculateRiderScoreTotals(scores, 0, 2);

    expect(result).toHaveLength(1);
    expect(result[0].riderId).toBe("rider-1");
    expect(result[0].total).toBe(15); // 8 (forward) + 7 (backloop)
  });

  it("should combine wave and jump totals", () => {
    // rider-1:
    //   waves: 9, 8, 7, 6 -> top 2 = 9 + 8 = 17
    //   jumps: forward=8, backloop=7 -> top 1 = 8
    //   total = 17 + 8 = 25
    const scores: Score[] = [
      createScore({ riderId: "rider-1", type: "wave", scoreValue: 9 }),
      createScore({ riderId: "rider-1", type: "wave", scoreValue: 8 }),
      createScore({ riderId: "rider-1", type: "wave", scoreValue: 7 }),
      createScore({ riderId: "rider-1", type: "wave", scoreValue: 6 }),
      createScore({
        riderId: "rider-1",
        type: "jump",
        scoreValue: 8,
        jumpType: "forward",
      }),
      createScore({
        riderId: "rider-1",
        type: "jump",
        scoreValue: 7,
        jumpType: "backloop",
      }),
    ];

    const result = calculateRiderScoreTotals(scores, 2, 1);

    expect(result).toHaveLength(1);
    expect(result[0].total).toBe(25); // (9+8) + 8
  });

  it("should sort riders by total descending", () => {
    const scores: Score[] = [
      // rider-1 total = 5
      createScore({ riderId: "rider-1", type: "wave", scoreValue: 5 }),
      // rider-2 total = 9
      createScore({ riderId: "rider-2", type: "wave", scoreValue: 9 }),
      // rider-3 total = 7
      createScore({ riderId: "rider-3", type: "wave", scoreValue: 7 }),
    ];

    const result = calculateRiderScoreTotals(scores, 3, 0);

    expect(result).toHaveLength(3);
    expect(result[0].riderId).toBe("rider-2");
    expect(result[0].total).toBe(9);
    expect(result[1].riderId).toBe("rider-3");
    expect(result[1].total).toBe(7);
    expect(result[2].riderId).toBe("rider-1");
    expect(result[2].total).toBe(5);
  });

  it("should handle rider with only jump scores", () => {
    const scores: Score[] = [
      createScore({
        riderId: "rider-1",
        type: "jump",
        scoreValue: 8,
        jumpType: "forward",
      }),
      createScore({
        riderId: "rider-1",
        type: "jump",
        scoreValue: 6,
        jumpType: "backloop",
      }),
    ];

    const result = calculateRiderScoreTotals(scores, 3, 2);

    expect(result).toHaveLength(1);
    expect(result[0].riderId).toBe("rider-1");
    expect(result[0].total).toBe(14); // 8 + 6
  });

  it("should handle rider with only wave scores", () => {
    const scores: Score[] = [
      createScore({ riderId: "rider-1", type: "wave", scoreValue: 9 }),
      createScore({ riderId: "rider-1", type: "wave", scoreValue: 7 }),
      createScore({ riderId: "rider-1", type: "wave", scoreValue: 5 }),
    ];

    const result = calculateRiderScoreTotals(scores, 2, 3);

    expect(result).toHaveLength(1);
    expect(result[0].riderId).toBe("rider-1");
    expect(result[0].total).toBe(16); // 9 + 7
  });

  it("should handle wavesCounting = 0", () => {
    // Only jumps should count
    const scores: Score[] = [
      createScore({ riderId: "rider-1", type: "wave", scoreValue: 10 }),
      createScore({
        riderId: "rider-1",
        type: "jump",
        scoreValue: 6,
        jumpType: "forward",
      }),
    ];

    const result = calculateRiderScoreTotals(scores, 0, 2);

    expect(result).toHaveLength(1);
    expect(result[0].riderId).toBe("rider-1");
    expect(result[0].total).toBe(6); // Only the jump counts
  });

  it("should handle multiple riders correctly", () => {
    // rider-1: waves 9, 8 -> top 2 = 17; jumps forward=7 -> top 1 = 7; total = 24
    // rider-2: waves 6, 5 -> top 2 = 11; jumps backloop=9 -> top 1 = 9; total = 20
    const scores: Score[] = [
      createScore({ riderId: "rider-1", type: "wave", scoreValue: 9 }),
      createScore({ riderId: "rider-1", type: "wave", scoreValue: 8 }),
      createScore({
        riderId: "rider-1",
        type: "jump",
        scoreValue: 7,
        jumpType: "forward",
      }),
      createScore({ riderId: "rider-2", type: "wave", scoreValue: 6 }),
      createScore({ riderId: "rider-2", type: "wave", scoreValue: 5 }),
      createScore({
        riderId: "rider-2",
        type: "jump",
        scoreValue: 9,
        jumpType: "backloop",
      }),
    ];

    const result = calculateRiderScoreTotals(scores, 2, 1);

    expect(result).toHaveLength(2);
    // rider-1 (24) should be first
    expect(result[0].riderId).toBe("rider-1");
    expect(result[0].total).toBe(24);
    // rider-2 (20) should be second
    expect(result[1].riderId).toBe("rider-2");
    expect(result[1].total).toBe(20);
  });
});
