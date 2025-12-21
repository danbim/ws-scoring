import { describe, expect, it } from "bun:test";
import {
  calculateJumpTotal,
  type JumpScore,
  type JumpType,
} from "../../../src/domain/heat/index.js";

describe("calculateJumpTotal", () => {
  const createJumpScore = (
    riderId: string,
    score: number,
    jumpType: JumpType,
    scoreUUID: string
  ): JumpScore => ({
    type: "jump",
    scoreUUID,
    riderId,
    score,
    jumpType,
    timestamp: new Date(),
  });

  it("should only count one jump per type, then take top N", () => {
    // Rider has:
    // - Two frontloops: 7.5 and 6.5 points
    // - One backloop: 5 points
    // - One cheese roll: 4 points
    const scores: JumpScore[] = [
      createJumpScore("rider-1", 7.5, "forward", "score-1"),
      createJumpScore("rider-1", 6.5, "forward", "score-2"),
      createJumpScore("rider-1", 5, "backloop", "score-3"),
      createJumpScore("rider-1", 4, "cheeseRoll", "score-4"),
    ];

    // With jumpsCounting=2, should get:
    // Best per type: forward=7.5, backloop=5, cheeseRoll=4
    // Top 2: 7.5 + 5 = 12.5
    const result = calculateJumpTotal("rider-1", scores, 2);
    expect(result).toBe(12.5);
  });

  it("should take best jump when multiple jumps of same type exist", () => {
    const scores: JumpScore[] = [
      createJumpScore("rider-1", 8.0, "forward", "score-1"),
      createJumpScore("rider-1", 9.0, "forward", "score-2"), // Best forward
      createJumpScore("rider-1", 7.0, "forward", "score-3"),
      createJumpScore("rider-1", 6.0, "backloop", "score-4"),
    ];

    // Should only count the best forward (9.0) and backloop (6.0)
    const result = calculateJumpTotal("rider-1", scores, 2);
    expect(result).toBe(15.0); // 9.0 + 6.0
  });

  it("should handle single jump per type correctly", () => {
    const scores: JumpScore[] = [
      createJumpScore("rider-1", 8.0, "forward", "score-1"),
      createJumpScore("rider-1", 6.0, "backloop", "score-2"),
      createJumpScore("rider-1", 4.0, "cheeseRoll", "score-3"),
    ];

    // With jumpsCounting=2, should get top 2: 8.0 + 6.0 = 14.0
    const result = calculateJumpTotal("rider-1", scores, 2);
    expect(result).toBe(14.0);
  });

  it("should only count jumps for the specified rider", () => {
    const scores: JumpScore[] = [
      createJumpScore("rider-1", 8.0, "forward", "score-1"),
      createJumpScore("rider-2", 9.0, "forward", "score-2"), // Different rider
      createJumpScore("rider-1", 6.0, "backloop", "score-3"),
    ];

    // Should only count rider-1's jumps: 8.0 + 6.0 = 14.0
    const result = calculateJumpTotal("rider-1", scores, 2);
    expect(result).toBe(14.0);
  });

  it("should handle jumpsCounting greater than available jump types", () => {
    const scores: JumpScore[] = [
      createJumpScore("rider-1", 8.0, "forward", "score-1"),
      createJumpScore("rider-1", 6.0, "backloop", "score-2"),
    ];

    // Only 2 jump types available, but jumpsCounting=5
    // Should return sum of all available: 8.0 + 6.0 = 14.0
    const result = calculateJumpTotal("rider-1", scores, 5);
    expect(result).toBe(14.0);
  });

  it("should return 0 when rider has no jumps", () => {
    const scores: JumpScore[] = [createJumpScore("rider-2", 8.0, "forward", "score-1")];

    const result = calculateJumpTotal("rider-1", scores, 2);
    expect(result).toBe(0);
  });

  it("should handle all jump types correctly", () => {
    const jumpTypes: JumpType[] = [
      "forward",
      "backloop",
      "doubleForward",
      "pushLoop",
      "pushForward",
      "tableTop",
      "cheeseRoll",
    ];

    const scores: JumpScore[] = jumpTypes.map((jumpType, index) =>
      createJumpScore("rider-1", 10 - index, jumpType, `score-${index}`)
    );

    // With jumpsCounting=3, should get top 3: 10 + 9 + 8 = 27
    const result = calculateJumpTotal("rider-1", scores, 3);
    expect(result).toBe(27);
  });
});
