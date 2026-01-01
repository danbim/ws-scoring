import { describe, expect, it } from "bun:test";
import {
  buildHeatViewerState,
  type HeatState,
  type JumpScore,
  type JumpType,
  type WaveScore,
} from "../../../src/domain/heat/index.js";

describe("buildHeatViewerState", () => {
  const createWaveScore = (riderId: string, score: number, scoreUUID: string): WaveScore => ({
    type: "wave",
    scoreUUID,
    riderId,
    score,
    timestamp: new Date(),
  });

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

  const createHeatState = (
    heatId: string,
    riderIds: string[],
    scores: (WaveScore | JumpScore)[]
  ): HeatState => ({
    heatId,
    riderIds,
    heatRules: {
      wavesCounting: 2,
      jumpsCounting: 1,
    },
    scores,
    bracketId: "00000000-0000-0000-0000-000000000000",
  });

  it("should build viewer state with multiple riders sorted by total score", () => {
    const heatState = createHeatState(
      "heat-1",
      ["K-90", "I-676"],
      [
        createWaveScore("K-90", 8.5, "wave-1"),
        createWaveScore("K-90", 7.0, "wave-2"),
        createJumpScore("K-90", 9.0, "forward", "jump-1"),
        createWaveScore("I-676", 9.0, "wave-3"),
        createWaveScore("I-676", 8.0, "wave-4"),
        createJumpScore("I-676", 8.5, "backloop", "jump-2"),
      ]
    );

    const result = buildHeatViewerState(heatState);

    expect(result.heatId).toBe("heat-1");
    expect(result.riders).toHaveLength(2);

    // I-676 should be first (wave: 9.0 + 8.0 = 17.0, jump: 8.5, total: 25.5)
    expect(result.riders[0].riderId).toBe("I-676");
    expect(result.riders[0].position).toBe(1);
    expect(result.riders[0].waveTotal).toBe(17.0);
    expect(result.riders[0].jumpTotal).toBe(8.5);
    expect(result.riders[0].total).toBe(25.5);
    expect(result.riders[0].country).toBe("IT");
    expect(result.riders[0].sailNumber).toBe("I-676");
    expect(result.riders[0].lastName).toBe("Morislo");

    // K-90 should be second (wave: 8.5 + 7.0 = 15.5, jump: 9.0, total: 24.5)
    expect(result.riders[1].riderId).toBe("K-90");
    expect(result.riders[1].position).toBe(2);
    expect(result.riders[1].waveTotal).toBe(15.5);
    expect(result.riders[1].jumpTotal).toBe(9.0);
    expect(result.riders[1].total).toBe(24.5);
    expect(result.riders[1].country).toBe("GB");
    expect(result.riders[1].sailNumber).toBe("K-90");
    expect(result.riders[1].lastName).toBe("Meldrum");
  });

  it("should handle riders with mock data correctly", () => {
    const heatState = createHeatState(
      "heat-1",
      ["E-255", "SBH-8"],
      [createWaveScore("E-255", 8.0, "wave-1"), createWaveScore("SBH-8", 7.0, "wave-2")]
    );

    const result = buildHeatViewerState(heatState);

    expect(result.riders[0].riderId).toBe("E-255");
    expect(result.riders[0].country).toBe("ES");
    expect(result.riders[0].sailNumber).toBe("E-255");
    expect(result.riders[0].lastName).toBe("Friedi Morales");

    expect(result.riders[1].riderId).toBe("SBH-8");
    expect(result.riders[1].country).toBe("");
    expect(result.riders[1].sailNumber).toBe("SBH-8");
    expect(result.riders[1].lastName).toBe("Beauvarlet");
  });

  it("should parse rider metadata from riderId when not in mock data", () => {
    const heatState = createHeatState(
      "heat-1",
      ["K-123", "I-456", "E-789", "F-999"],
      [
        createWaveScore("K-123", 8.0, "wave-1"),
        createWaveScore("I-456", 7.0, "wave-2"),
        createWaveScore("E-789", 6.0, "wave-3"),
        createWaveScore("F-999", 5.0, "wave-4"),
      ]
    );

    const result = buildHeatViewerState(heatState);

    // K prefix should map to GB
    expect(result.riders.find((r) => r.riderId === "K-123")?.country).toBe("GB");
    expect(result.riders.find((r) => r.riderId === "K-123")?.sailNumber).toBe("K-123");
    expect(result.riders.find((r) => r.riderId === "K-123")?.lastName).toBe("K-123");

    // I prefix should map to IT
    expect(result.riders.find((r) => r.riderId === "I-456")?.country).toBe("IT");
    expect(result.riders.find((r) => r.riderId === "I-456")?.sailNumber).toBe("I-456");

    // E prefix should map to ES
    expect(result.riders.find((r) => r.riderId === "E-789")?.country).toBe("ES");
    expect(result.riders.find((r) => r.riderId === "E-789")?.sailNumber).toBe("E-789");

    // Unknown prefix should have empty country
    expect(result.riders.find((r) => r.riderId === "F-999")?.country).toBe("");
    expect(result.riders.find((r) => r.riderId === "F-999")?.sailNumber).toBe("F-999");
    expect(result.riders.find((r) => r.riderId === "F-999")?.lastName).toBe("F-999");
  });

  it("should assign positions correctly (1-based, sorted by total descending)", () => {
    const heatState = createHeatState(
      "heat-1",
      ["rider-1", "rider-2", "rider-3"],
      [
        createWaveScore("rider-1", 10.0, "wave-1"), // total: 10.0
        createWaveScore("rider-2", 9.0, "wave-2"), // total: 9.0
        createWaveScore("rider-3", 8.0, "wave-3"), // total: 8.0
      ]
    );

    const result = buildHeatViewerState(heatState);

    expect(result.riders[0].position).toBe(1);
    expect(result.riders[0].riderId).toBe("rider-1");

    expect(result.riders[1].position).toBe(2);
    expect(result.riders[1].riderId).toBe("rider-2");

    expect(result.riders[2].position).toBe(3);
    expect(result.riders[2].riderId).toBe("rider-3");
  });

  it("should handle ties by sorting consistently", () => {
    const heatState = createHeatState(
      "heat-1",
      ["rider-1", "rider-2"],
      [createWaveScore("rider-1", 8.0, "wave-1"), createWaveScore("rider-2", 8.0, "wave-2")]
    );

    const result = buildHeatViewerState(heatState);

    expect(result.riders).toHaveLength(2);
    expect(result.riders[0].total).toBe(result.riders[1].total);
    // Both should have valid positions
    expect(result.riders[0].position).toBe(1);
    expect(result.riders[1].position).toBe(2);
  });

  it("should handle empty scores correctly", () => {
    const heatState = createHeatState("heat-1", ["K-90", "I-676"], []);

    const result = buildHeatViewerState(heatState);

    expect(result.riders).toHaveLength(2);
    expect(result.riders[0].waveTotal).toBe(0);
    expect(result.riders[0].jumpTotal).toBe(0);
    expect(result.riders[0].total).toBe(0);
    expect(result.riders[1].waveTotal).toBe(0);
    expect(result.riders[1].jumpTotal).toBe(0);
    expect(result.riders[1].total).toBe(0);
  });

  it("should handle single rider correctly", () => {
    const heatState = createHeatState(
      "heat-1",
      ["K-90"],
      [createWaveScore("K-90", 8.5, "wave-1"), createJumpScore("K-90", 9.0, "forward", "jump-1")]
    );

    const result = buildHeatViewerState(heatState);

    expect(result.riders).toHaveLength(1);
    expect(result.riders[0].riderId).toBe("K-90");
    expect(result.riders[0].position).toBe(1);
    expect(result.riders[0].waveTotal).toBe(8.5);
    expect(result.riders[0].jumpTotal).toBe(9.0);
    expect(result.riders[0].total).toBe(17.5);
  });

  it("should respect heatRules for counting scores", () => {
    const heatState: HeatState = {
      heatId: "heat-1",
      riderIds: ["rider-1"],
      heatRules: {
        wavesCounting: 2,
        jumpsCounting: 1,
      },
      scores: [
        createWaveScore("rider-1", 10.0, "wave-1"),
        createWaveScore("rider-1", 9.0, "wave-2"),
        createWaveScore("rider-1", 8.0, "wave-3"), // Should not count (only top 2)
        createJumpScore("rider-1", 9.0, "forward", "jump-1"),
        createJumpScore("rider-1", 8.0, "backloop", "jump-2"), // Should not count (only top 1)
      ],
      bracketId: "00000000-0000-0000-0000-000000000000",
    };

    const result = buildHeatViewerState(heatState);

    expect(result.riders[0].waveTotal).toBe(19.0); // 10.0 + 9.0 (top 2)
    expect(result.riders[0].jumpTotal).toBe(9.0); // 9.0 (top 1)
    expect(result.riders[0].total).toBe(28.0);
  });

  it("should handle riders with only wave scores", () => {
    const heatState = createHeatState(
      "heat-1",
      ["rider-1"],
      [createWaveScore("rider-1", 8.5, "wave-1"), createWaveScore("rider-1", 7.5, "wave-2")]
    );

    const result = buildHeatViewerState(heatState);

    expect(result.riders[0].waveTotal).toBe(16.0);
    expect(result.riders[0].jumpTotal).toBe(0);
    expect(result.riders[0].total).toBe(16.0);
  });

  it("should handle riders with only jump scores", () => {
    const heatState = createHeatState(
      "heat-1",
      ["rider-1"],
      [
        createJumpScore("rider-1", 9.0, "forward", "jump-1"),
        createJumpScore("rider-1", 8.0, "backloop", "jump-2"),
      ]
    );

    const result = buildHeatViewerState(heatState);

    expect(result.riders[0].waveTotal).toBe(0);
    expect(result.riders[0].jumpTotal).toBe(9.0); // Only top 1 counts
    expect(result.riders[0].total).toBe(9.0);
  });

  it("should correctly calculate totals for complex scenario", () => {
    const heatState = createHeatState(
      "heat-1",
      ["rider-1", "rider-2", "rider-3"],
      [
        // Rider 1: waves 10, 9, 8 (top 2 = 19), jumps 9, 8 (top 1 = 9), total = 28
        createWaveScore("rider-1", 10.0, "wave-1"),
        createWaveScore("rider-1", 9.0, "wave-2"),
        createWaveScore("rider-1", 8.0, "wave-3"),
        createJumpScore("rider-1", 9.0, "forward", "jump-1"),
        createJumpScore("rider-1", 8.0, "backloop", "jump-2"),
        // Rider 2: waves 8, 7 (top 2 = 15), jumps 10, 9 (top 1 = 10), total = 25
        createWaveScore("rider-2", 8.0, "wave-4"),
        createWaveScore("rider-2", 7.0, "wave-5"),
        createJumpScore("rider-2", 10.0, "forward", "jump-3"),
        createJumpScore("rider-2", 9.0, "backloop", "jump-4"),
        // Rider 3: waves 6, 5 (top 2 = 11), jumps 7, 6 (top 1 = 7), total = 18
        createWaveScore("rider-3", 6.0, "wave-6"),
        createWaveScore("rider-3", 5.0, "wave-7"),
        createJumpScore("rider-3", 7.0, "forward", "jump-5"),
        createJumpScore("rider-3", 6.0, "backloop", "jump-6"),
      ]
    );

    const result = buildHeatViewerState(heatState);

    expect(result.riders[0].riderId).toBe("rider-1");
    expect(result.riders[0].total).toBe(28.0);
    expect(result.riders[0].position).toBe(1);

    expect(result.riders[1].riderId).toBe("rider-2");
    expect(result.riders[1].total).toBe(25.0);
    expect(result.riders[1].position).toBe(2);

    expect(result.riders[2].riderId).toBe("rider-3");
    expect(result.riders[2].total).toBe(18.0);
    expect(result.riders[2].position).toBe(3);
  });
});
