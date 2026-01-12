import { describe, expect, it } from "bun:test";
import {
  type JudgeScore,
  validateJudgeAgreementFrontend,
} from "../../../src/app/utils/judgeAgreementValidator";

describe("validateJudgeAgreementFrontend", () => {
  it("should return no discrepancies when judges agree on wave counts", () => {
    const scores: JudgeScore[] = [
      {
        scoreUUID: "w1",
        riderId: "rider1",
        judgeId: "judge1",
        type: "wave",
        scoreValue: 7.5,
        jumpType: null,
        modifiers: null,
        timestamp: new Date(),
      },
      {
        scoreUUID: "w2",
        riderId: "rider1",
        judgeId: "judge1",
        type: "wave",
        scoreValue: 8.0,
        jumpType: null,
        modifiers: null,
        timestamp: new Date(),
      },
      {
        scoreUUID: "w3",
        riderId: "rider1",
        judgeId: "judge2",
        type: "wave",
        scoreValue: 7.0,
        jumpType: null,
        modifiers: null,
        timestamp: new Date(),
      },
      {
        scoreUUID: "w4",
        riderId: "rider1",
        judgeId: "judge2",
        type: "wave",
        scoreValue: 8.5,
        jumpType: null,
        modifiers: null,
        timestamp: new Date(),
      },
    ];

    const result = validateJudgeAgreementFrontend(scores, { rider1: "John Doe" });

    expect(result.hasDiscrepancies).toBe(false);
    expect(result.discrepancies).toHaveLength(0);
  });

  it("should detect wave count discrepancies", () => {
    const scores: JudgeScore[] = [
      {
        scoreUUID: "w1",
        riderId: "rider1",
        judgeId: "judge1",
        type: "wave",
        scoreValue: 7.5,
        jumpType: null,
        modifiers: null,
        timestamp: new Date(),
      },
      {
        scoreUUID: "w2",
        riderId: "rider1",
        judgeId: "judge1",
        type: "wave",
        scoreValue: 8.0,
        jumpType: null,
        modifiers: null,
        timestamp: new Date(),
      },
      {
        scoreUUID: "w3",
        riderId: "rider1",
        judgeId: "judge2",
        type: "wave",
        scoreValue: 7.0,
        jumpType: null,
        modifiers: null,
        timestamp: new Date(),
      },
    ];

    const result = validateJudgeAgreementFrontend(scores, { rider1: "John Doe" });

    expect(result.hasDiscrepancies).toBe(true);
    expect(result.discrepancies).toHaveLength(1);
    expect(result.discrepancies[0].riderId).toBe("rider1");
    expect(result.discrepancies[0].waveDiscrepancy).toBeDefined();
    expect(result.discrepancies[0].waveDiscrepancy?.judgeCounts).toEqual({
      judge1: 2,
      judge2: 1,
    });
  });

  it("should detect jump catalog discrepancies - different modifiers", () => {
    const scores: JudgeScore[] = [
      {
        scoreUUID: "j1",
        riderId: "rider1",
        judgeId: "judge1",
        type: "jump",
        scoreValue: 8.0,
        jumpType: "forward",
        modifiers: ["oneHanded"],
        timestamp: new Date(),
      },
      {
        scoreUUID: "j2",
        riderId: "rider1",
        judgeId: "judge2",
        type: "jump",
        scoreValue: 7.5,
        jumpType: "forward",
        modifiers: [],
        timestamp: new Date(),
      },
    ];

    const result = validateJudgeAgreementFrontend(scores, { rider1: "John Doe" });

    expect(result.hasDiscrepancies).toBe(true);
    expect(result.discrepancies).toHaveLength(1);
    expect(result.discrepancies[0].jumpDiscrepancy).toBeDefined();
  });

  it("should detect jump catalog discrepancies - different jump types", () => {
    const scores: JudgeScore[] = [
      {
        scoreUUID: "j1",
        riderId: "rider1",
        judgeId: "judge1",
        type: "jump",
        scoreValue: 8.0,
        jumpType: "forward",
        modifiers: [],
        timestamp: new Date(),
      },
      {
        scoreUUID: "j2",
        riderId: "rider1",
        judgeId: "judge2",
        type: "jump",
        scoreValue: 7.5,
        jumpType: "backloop",
        modifiers: [],
        timestamp: new Date(),
      },
    ];

    const result = validateJudgeAgreementFrontend(scores, { rider1: "John Doe" });

    expect(result.hasDiscrepancies).toBe(true);
    expect(result.discrepancies[0].jumpDiscrepancy).toBeDefined();
  });

  it("should handle duplicate jumps correctly - same jump recorded multiple times", () => {
    const scores: JudgeScore[] = [
      {
        scoreUUID: "j1",
        riderId: "rider1",
        judgeId: "judge1",
        type: "jump",
        scoreValue: 8.0,
        jumpType: "forward",
        modifiers: [],
        timestamp: new Date(),
      },
      {
        scoreUUID: "j2",
        riderId: "rider1",
        judgeId: "judge1",
        type: "jump",
        scoreValue: 7.5,
        jumpType: "forward",
        modifiers: [],
        timestamp: new Date(),
      },
      {
        scoreUUID: "j3",
        riderId: "rider1",
        judgeId: "judge2",
        type: "jump",
        scoreValue: 8.5,
        jumpType: "forward",
        modifiers: [],
        timestamp: new Date(),
      },
    ];

    const result = validateJudgeAgreementFrontend(scores, { rider1: "John Doe" });

    // Judge 1 recorded forward twice, judge 2 once - catalogs should match (same unique jump)
    expect(result.hasDiscrepancies).toBe(false);
  });

  it("should agree when judges have same jumps in different order", () => {
    const scores: JudgeScore[] = [
      {
        scoreUUID: "j1",
        riderId: "rider1",
        judgeId: "judge1",
        type: "jump",
        scoreValue: 8.0,
        jumpType: "forward",
        modifiers: [],
        timestamp: new Date(),
      },
      {
        scoreUUID: "j2",
        riderId: "rider1",
        judgeId: "judge1",
        type: "jump",
        scoreValue: 7.5,
        jumpType: "backloop",
        modifiers: [],
        timestamp: new Date(),
      },
      {
        scoreUUID: "j3",
        riderId: "rider1",
        judgeId: "judge2",
        type: "jump",
        scoreValue: 8.5,
        jumpType: "backloop",
        modifiers: [],
        timestamp: new Date(),
      },
      {
        scoreUUID: "j4",
        riderId: "rider1",
        judgeId: "judge2",
        type: "jump",
        scoreValue: 7.0,
        jumpType: "forward",
        modifiers: [],
        timestamp: new Date(),
      },
    ];

    const result = validateJudgeAgreementFrontend(scores, { rider1: "John Doe" });

    // Both judges recorded forward and backloop, just in different order
    expect(result.hasDiscrepancies).toBe(false);
  });

  it("should return no discrepancies when there is only one judge", () => {
    const scores: JudgeScore[] = [
      {
        scoreUUID: "w1",
        riderId: "rider1",
        judgeId: "judge1",
        type: "wave",
        scoreValue: 7.5,
        jumpType: null,
        modifiers: null,
        timestamp: new Date(),
      },
      {
        scoreUUID: "w2",
        riderId: "rider1",
        judgeId: "judge1",
        type: "wave",
        scoreValue: 8.0,
        jumpType: null,
        modifiers: null,
        timestamp: new Date(),
      },
    ];

    const result = validateJudgeAgreementFrontend(scores, { rider1: "John Doe" });

    expect(result.hasDiscrepancies).toBe(false);
    expect(result.discrepancies).toHaveLength(0);
  });

  it("should return no discrepancies when there are no scores", () => {
    const scores: JudgeScore[] = [];

    const result = validateJudgeAgreementFrontend(scores, { rider1: "John Doe" });

    expect(result.hasDiscrepancies).toBe(false);
    expect(result.discrepancies).toHaveLength(0);
  });

  it("should handle multiple riders with mixed discrepancies", () => {
    const scores: JudgeScore[] = [
      // Rider 1 - wave discrepancy
      {
        scoreUUID: "w1",
        riderId: "rider1",
        judgeId: "judge1",
        type: "wave",
        scoreValue: 7.5,
        jumpType: null,
        modifiers: null,
        timestamp: new Date(),
      },
      {
        scoreUUID: "w2",
        riderId: "rider1",
        judgeId: "judge2",
        type: "wave",
        scoreValue: 7.5,
        jumpType: null,
        modifiers: null,
        timestamp: new Date(),
      },
      {
        scoreUUID: "w3",
        riderId: "rider1",
        judgeId: "judge2",
        type: "wave",
        scoreValue: 8.0,
        jumpType: null,
        modifiers: null,
        timestamp: new Date(),
      },
      // Rider 2 - no discrepancies
      {
        scoreUUID: "w4",
        riderId: "rider2",
        judgeId: "judge1",
        type: "wave",
        scoreValue: 7.5,
        jumpType: null,
        modifiers: null,
        timestamp: new Date(),
      },
      {
        scoreUUID: "w5",
        riderId: "rider2",
        judgeId: "judge2",
        type: "wave",
        scoreValue: 8.0,
        jumpType: null,
        modifiers: null,
        timestamp: new Date(),
      },
    ];

    const result = validateJudgeAgreementFrontend(scores, {
      rider1: "John Doe",
      rider2: "Jane Smith",
    });

    expect(result.hasDiscrepancies).toBe(true);
    expect(result.discrepancies).toHaveLength(1);
    expect(result.discrepancies[0].riderId).toBe("rider1");
  });

  it("should handle null and empty modifiers correctly", () => {
    const scores: JudgeScore[] = [
      {
        scoreUUID: "j1",
        riderId: "rider1",
        judgeId: "judge1",
        type: "jump",
        scoreValue: 8.0,
        jumpType: "forward",
        modifiers: null,
        timestamp: new Date(),
      },
      {
        scoreUUID: "j2",
        riderId: "rider1",
        judgeId: "judge2",
        type: "jump",
        scoreValue: 7.5,
        jumpType: "forward",
        modifiers: [],
        timestamp: new Date(),
      },
    ];

    const result = validateJudgeAgreementFrontend(scores, { rider1: "John Doe" });

    // null and [] should be treated as the same
    expect(result.hasDiscrepancies).toBe(false);
  });

  it("should sort modifiers before comparison", () => {
    const scores: JudgeScore[] = [
      {
        scoreUUID: "j1",
        riderId: "rider1",
        judgeId: "judge1",
        type: "jump",
        scoreValue: 8.0,
        jumpType: "forward",
        modifiers: ["oneHanded", "oneFooted"],
        timestamp: new Date(),
      },
      {
        scoreUUID: "j2",
        riderId: "rider1",
        judgeId: "judge2",
        type: "jump",
        scoreValue: 7.5,
        jumpType: "forward",
        modifiers: ["oneFooted", "oneHanded"],
        timestamp: new Date(),
      },
    ];

    const result = validateJudgeAgreementFrontend(scores, { rider1: "John Doe" });

    // Different order of modifiers should still match
    expect(result.hasDiscrepancies).toBe(false);
  });
});
