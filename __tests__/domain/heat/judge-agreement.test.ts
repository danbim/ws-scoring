import { describe, expect, it } from "bun:test";
import { validateJudgeAgreement } from "../../../src/domain/heat/judge-agreement";
import type { Score } from "../../../src/domain/heat/types";

describe("validateJudgeAgreement", () => {
  it("should return no discrepancies when judges agree on wave counts", () => {
    const scores: Score[] = [
      {
        type: "wave",
        scoreUUID: "w1",
        riderId: "rider1",
        judgeId: "judge1",
        score: 7.5,
        timestamp: new Date(),
      },
      {
        type: "wave",
        scoreUUID: "w2",
        riderId: "rider1",
        judgeId: "judge1",
        score: 8.0,
        timestamp: new Date(),
      },
      {
        type: "wave",
        scoreUUID: "w3",
        riderId: "rider1",
        judgeId: "judge2",
        score: 7.0,
        timestamp: new Date(),
      },
      {
        type: "wave",
        scoreUUID: "w4",
        riderId: "rider1",
        judgeId: "judge2",
        score: 8.5,
        timestamp: new Date(),
      },
    ];

    const result = validateJudgeAgreement(scores, ["rider1"]);

    expect(result.hasDiscrepancies).toBe(false);
    expect(result.discrepancies).toHaveLength(0);
  });

  it("should detect wave count discrepancies", () => {
    const scores: Score[] = [
      {
        type: "wave",
        scoreUUID: "w1",
        riderId: "rider1",
        judgeId: "judge1",
        score: 7.5,
        timestamp: new Date(),
      },
      {
        type: "wave",
        scoreUUID: "w2",
        riderId: "rider1",
        judgeId: "judge1",
        score: 8.0,
        timestamp: new Date(),
      },
      {
        type: "wave",
        scoreUUID: "w3",
        riderId: "rider1",
        judgeId: "judge2",
        score: 7.0,
        timestamp: new Date(),
      },
    ];

    const result = validateJudgeAgreement(scores, ["rider1"]);

    expect(result.hasDiscrepancies).toBe(true);
    expect(result.discrepancies).toHaveLength(1);
    expect(result.discrepancies[0].type).toBe("wave_count");
    expect(result.discrepancies[0].riderId).toBe("rider1");
  });

  it("should detect jump catalog discrepancies", () => {
    const scores: Score[] = [
      {
        type: "jump",
        scoreUUID: "j1",
        riderId: "rider1",
        judgeId: "judge1",
        score: 8.0,
        jumpType: "forward",
        modifiers: ["oneHanded"],
        timestamp: new Date(),
      },
      {
        type: "jump",
        scoreUUID: "j2",
        riderId: "rider1",
        judgeId: "judge2",
        score: 7.5,
        jumpType: "forward",
        modifiers: [],
        timestamp: new Date(),
      },
    ];

    const result = validateJudgeAgreement(scores, ["rider1"]);

    expect(result.hasDiscrepancies).toBe(true);
    expect(result.discrepancies[0].type).toBe("jump_catalog");
  });

  it("should return no discrepancies when there is only one judge", () => {
    const scores: Score[] = [
      {
        type: "wave",
        scoreUUID: "w1",
        riderId: "rider1",
        judgeId: "judge1",
        score: 7.5,
        timestamp: new Date(),
      },
      {
        type: "wave",
        scoreUUID: "w2",
        riderId: "rider1",
        judgeId: "judge1",
        score: 8.0,
        timestamp: new Date(),
      },
    ];

    const result = validateJudgeAgreement(scores, ["rider1"]);

    expect(result.hasDiscrepancies).toBe(false);
    expect(result.discrepancies).toHaveLength(0);
  });

  it("should return no discrepancies when there are no scores", () => {
    const scores: Score[] = [];

    const result = validateJudgeAgreement(scores, ["rider1"]);

    expect(result.hasDiscrepancies).toBe(false);
    expect(result.discrepancies).toHaveLength(0);
  });
});
