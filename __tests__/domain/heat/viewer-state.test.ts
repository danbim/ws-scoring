import { describe, expect, it, mock } from "bun:test";
import {
  buildHeatViewerState,
  type HeatState,
  type JumpScore,
  type JumpType,
  type WaveScore,
} from "../../../src/domain/heat/index.js";
import type { RiderRepository } from "../../../src/domain/rider/repositories.js";
import type { Rider } from "../../../src/domain/rider/types.js";
import { DEFAULT_TEST_BRACKET_ID } from "../../test-utils.js";

describe("buildHeatViewerState", () => {
  const createWaveScore = (riderId: string, score: number, scoreUUID: string): WaveScore => ({
    type: "wave",
    scoreUUID,
    riderId,
    judgeId: "test-judge",
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
    judgeId: "test-judge",
    score,
    jumpType,
    modifiers: [],
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
    bracketId: DEFAULT_TEST_BRACKET_ID,
    position: "1",
    completedAt: null,
  });

  // Mock Rider Repository
  const mockRiders: Record<string, Rider> = {
    "K-90": {
      id: "K-90",
      firstName: "James",
      lastName: "Meldrum",
      country: "GB",
      sailNumber: "K-90",
      email: null,
      dateOfBirth: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    },
    "I-676": {
      id: "I-676",
      firstName: "Matteo",
      lastName: "Morislo",
      country: "IT",
      sailNumber: "I-676",
      email: null,
      dateOfBirth: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    },
    "E-255": {
      id: "E-255",
      firstName: "Victor",
      lastName: "Friedi Morales",
      country: "ES",
      sailNumber: "E-255",
      email: null,
      dateOfBirth: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    },
    "SBH-8": {
      id: "SBH-8",
      firstName: "Anton",
      lastName: "Beauvarlet",
      country: "", // Intentionally empty to test fallback/empty case handling
      sailNumber: "SBH-8",
      email: null,
      dateOfBirth: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    },
  };

  const mockRiderRepository: RiderRepository = {
    getRiderById: mock(async (id: string) => mockRiders[id] || null),
    createRider: mock(async () => {
      throw new Error("Not implemented");
    }),
    getAllRiders: mock(async () => {
      throw new Error("Not implemented");
    }),
    updateRider: mock(async () => {
      throw new Error("Not implemented");
    }),
    deleteRider: mock(async () => {
      throw new Error("Not implemented");
    }),
    restoreRider: mock(async () => {
      throw new Error("Not implemented");
    }),
  };

  it("should build viewer state with multiple riders sorted by total score", async () => {
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

    const result = await buildHeatViewerState(heatState, mockRiderRepository);

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

  it("should handle riders with missing data correctly", async () => {
    const heatState = createHeatState(
      "heat-1",
      ["E-255", "SBH-8"],
      [createWaveScore("E-255", 8.0, "wave-1"), createWaveScore("SBH-8", 7.0, "wave-2")]
    );

    const result = await buildHeatViewerState(heatState, mockRiderRepository);

    expect(result.riders[0].riderId).toBe("E-255");
    expect(result.riders[0].country).toBe("ES");
    expect(result.riders[0].sailNumber).toBe("E-255");
    expect(result.riders[0].lastName).toBe("Friedi Morales");

    expect(result.riders[1].riderId).toBe("SBH-8");
    expect(result.riders[1].country).toBe("");
    expect(result.riders[1].sailNumber).toBe("SBH-8");
    expect(result.riders[1].lastName).toBe("Beauvarlet");
  });

  it("should handle unknown riders gracefully", async () => {
    const heatState = createHeatState(
      "heat-1",
      ["unknown-1"],
      [createWaveScore("unknown-1", 8.0, "wave-1")]
    );

    const result = await buildHeatViewerState(heatState, mockRiderRepository);

    expect(result.riders[0].riderId).toBe("unknown-1");
    // Should fallback to default/empty values
    expect(result.riders[0].country).toBe("");
    expect(result.riders[0].sailNumber).toBe("");
    expect(result.riders[0].lastName).toBe("Unknown Rider");
  });

  it("should assign positions correctly (1-based, sorted by total descending)", async () => {
    const heatState = createHeatState(
      "heat-1",
      ["rider-1", "rider-2", "rider-3"],
      [
        createWaveScore("rider-1", 10.0, "wave-1"), // total: 10.0
        createWaveScore("rider-2", 9.0, "wave-2"), // total: 9.0
        createWaveScore("rider-3", 8.0, "wave-3"), // total: 8.0
      ]
    );

    // Mock rider lookup for these generic IDs
    const extendedMockRepo = {
      ...mockRiderRepository,
      getRiderById: mock(async (id: string) => ({
        id,
        firstName: "First",
        lastName: `Last-${id}`,
        country: "US",
        sailNumber: id,
        email: null,
        dateOfBirth: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      })),
    };

    const result = await buildHeatViewerState(heatState, extendedMockRepo);

    expect(result.riders[0].position).toBe(1);
    expect(result.riders[0].riderId).toBe("rider-1");

    expect(result.riders[1].position).toBe(2);
    expect(result.riders[1].riderId).toBe("rider-2");

    expect(result.riders[2].position).toBe(3);
    expect(result.riders[2].riderId).toBe("rider-3");
  });

  it("should handle ties by sorting consistently", async () => {
    const heatState = createHeatState(
      "heat-1",
      ["rider-1", "rider-2"],
      [createWaveScore("rider-1", 8.0, "wave-1"), createWaveScore("rider-2", 8.0, "wave-2")]
    );

    const result = await buildHeatViewerState(heatState, mockRiderRepository);

    expect(result.riders).toHaveLength(2);
    expect(result.riders[0].total).toBe(result.riders[1].total);
    // Both should have valid positions
    expect(result.riders[0].position).toBe(1);
    expect(result.riders[1].position).toBe(2);
  });

  it("should handle empty scores correctly", async () => {
    const heatState = createHeatState("heat-1", ["K-90", "I-676"], []);

    const result = await buildHeatViewerState(heatState, mockRiderRepository);

    expect(result.riders).toHaveLength(2);
    expect(result.riders[0].waveTotal).toBe(0);
    expect(result.riders[0].jumpTotal).toBe(0);
    expect(result.riders[0].total).toBe(0);
    expect(result.riders[1].waveTotal).toBe(0);
    expect(result.riders[1].jumpTotal).toBe(0);
    expect(result.riders[1].total).toBe(0);
  });

  it("should handle single rider correctly", async () => {
    const heatState = createHeatState(
      "heat-1",
      ["K-90"],
      [createWaveScore("K-90", 8.5, "wave-1"), createJumpScore("K-90", 9.0, "forward", "jump-1")]
    );

    const result = await buildHeatViewerState(heatState, mockRiderRepository);

    expect(result.riders).toHaveLength(1);
    expect(result.riders[0].riderId).toBe("K-90");
    expect(result.riders[0].position).toBe(1);
    expect(result.riders[0].waveTotal).toBe(8.5);
    expect(result.riders[0].jumpTotal).toBe(9.0);
    expect(result.riders[0].total).toBe(17.5);
  });

  it("should respect heatRules for counting scores", async () => {
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
      bracketId: DEFAULT_TEST_BRACKET_ID,
      position: "1",
      completedAt: null,
    };

    const result = await buildHeatViewerState(heatState, mockRiderRepository);

    expect(result.riders[0].waveTotal).toBe(19.0); // 10.0 + 9.0 (top 2)
    expect(result.riders[0].jumpTotal).toBe(9.0); // 9.0 (top 1)
    expect(result.riders[0].total).toBe(28.0);
  });

  it("should handle riders with only wave scores", async () => {
    const heatState = createHeatState(
      "heat-1",
      ["rider-1"],
      [createWaveScore("rider-1", 8.5, "wave-1"), createWaveScore("rider-1", 7.5, "wave-2")]
    );

    const result = await buildHeatViewerState(heatState, mockRiderRepository);

    expect(result.riders[0].waveTotal).toBe(16.0);
    expect(result.riders[0].jumpTotal).toBe(0);
    expect(result.riders[0].total).toBe(16.0);
  });

  it("should handle riders with only jump scores", async () => {
    const heatState = createHeatState(
      "heat-1",
      ["rider-1"],
      [
        createJumpScore("rider-1", 9.0, "forward", "jump-1"),
        createJumpScore("rider-1", 8.0, "backloop", "jump-2"),
      ]
    );

    const result = await buildHeatViewerState(heatState, mockRiderRepository);

    expect(result.riders[0].waveTotal).toBe(0);
    expect(result.riders[0].jumpTotal).toBe(9.0); // Only top 1 counts
    expect(result.riders[0].total).toBe(9.0);
  });

  it("should correctly calculate totals for complex scenario", async () => {
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

    const mockRepo = {
      ...mockRiderRepository,
      getRiderById: mock(async (id: string) => ({
        id,
        firstName: "Generic",
        lastName: "Rider",
        country: "US",
        sailNumber: id,
        email: null,
        dateOfBirth: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      })),
    };

    const result = await buildHeatViewerState(heatState, mockRepo);

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
