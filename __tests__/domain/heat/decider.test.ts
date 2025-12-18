import { describe, it, expect } from "bun:test";
import {
  initialState,
  decide,
  evolve,
  type CreateHeat,
  type AddWaveScore,
  type AddJumpScore,
  type HeatState,
} from "../../../src/domain/heat/index.js";

describe("Heat Decider", () => {
  describe("initialState", () => {
    it("should return null for initial state", () => {
      const state = initialState();
      expect(state).toBeNull();
    });
  });

  describe("decide - CreateHeat", () => {
    it("should produce HeatCreated event for valid command", () => {
      const command: CreateHeat = {
        type: "CreateHeat",
        data: {
          heatId: "heat-1",
          riderIds: ["rider-1", "rider-2"],
          heatRules: {
            wavesCounting: 2,
            jumpsCounting: 1,
          },
        },
      };

      const events = decide(command, null);

      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        type: "HeatCreated",
        data: {
          heatId: "heat-1",
          riderIds: ["rider-1", "rider-2"],
          heatRules: {
            wavesCounting: 2,
            jumpsCounting: 1,
          },
        },
      });
    });

    it("should throw error if heat already exists", () => {
      const existingState: HeatState = {
        heatId: "heat-1",
        riderIds: ["rider-1"],
        heatRules: {
          wavesCounting: 2,
          jumpsCounting: 1,
        },
        scores: [],
      };

      const command: CreateHeat = {
        type: "CreateHeat",
        data: {
          heatId: "heat-1",
          riderIds: ["rider-2"],
          heatRules: {
            wavesCounting: 2,
            jumpsCounting: 1,
          },
        },
      };

      expect(() => decide(command, existingState)).toThrow(
        "Heat with id heat-1 already exists"
      );
    });

    it("should throw error if no riders provided", () => {
      const command: CreateHeat = {
        type: "CreateHeat",
        data: {
          heatId: "heat-1",
          riderIds: [],
          heatRules: {
            wavesCounting: 2,
            jumpsCounting: 1,
          },
        },
      };

      expect(() => decide(command, null)).toThrow(
        "Heat must have at least one rider"
      );
    });

    it("should throw error if rider IDs are not unique", () => {
      const command: CreateHeat = {
        type: "CreateHeat",
        data: {
          heatId: "heat-1",
          riderIds: ["rider-1", "rider-1"],
          heatRules: {
            wavesCounting: 2,
            jumpsCounting: 1,
          },
        },
      };

      expect(() => decide(command, null)).toThrow("Rider IDs must be unique");
    });

    it("should throw error if heat rules have non-positive values", () => {
      const command: CreateHeat = {
        type: "CreateHeat",
        data: {
          heatId: "heat-1",
          riderIds: ["rider-1"],
          heatRules: {
            wavesCounting: 0,
            jumpsCounting: 1,
          },
        },
      };

      expect(() => decide(command, null)).toThrow(
        "Heat rules must have positive counting values"
      );
    });
  });

  describe("decide - AddWaveScore", () => {
    const existingState: HeatState = {
      heatId: "heat-1",
      riderIds: ["rider-1", "rider-2"],
      heatRules: {
        wavesCounting: 2,
        jumpsCounting: 1,
      },
      scores: [],
    };

    it("should produce WaveScoreAdded event for valid command", () => {
      const command: AddWaveScore = {
        type: "AddWaveScore",
        data: {
          heatId: "heat-1",
          scoreUUID: "score-1",
          riderId: "rider-1",
          waveScore: 8.5,
          timestamp: new Date("2024-01-01T10:00:00Z"),
        },
      };

      const events = decide(command, existingState);

      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        type: "WaveScoreAdded",
        data: {
          heatId: "heat-1",
          scoreUUID: "score-1",
          riderId: "rider-1",
          waveScore: 8.5,
          timestamp: new Date("2024-01-01T10:00:00Z"),
        },
      });
    });

    it("should throw error if heat does not exist", () => {
      const command: AddWaveScore = {
        type: "AddWaveScore",
        data: {
          heatId: "heat-1",
          scoreUUID: "score-1",
          riderId: "rider-1",
          waveScore: 8.5,
          timestamp: new Date(),
        },
      };

      expect(() => decide(command, null)).toThrow(
        "Heat with id heat-1 does not exist"
      );
    });

    it("should throw error if heatId does not match", () => {
      const command: AddWaveScore = {
        type: "AddWaveScore",
        data: {
          heatId: "heat-2",
          scoreUUID: "score-1",
          riderId: "rider-1",
          waveScore: 8.5,
          timestamp: new Date(),
        },
      };

      expect(() => decide(command, existingState)).toThrow("Heat ID mismatch");
    });

    it("should throw error if rider is not in heat", () => {
      const command: AddWaveScore = {
        type: "AddWaveScore",
        data: {
          heatId: "heat-1",
          scoreUUID: "score-1",
          riderId: "rider-3",
          waveScore: 8.5,
          timestamp: new Date(),
        },
      };

      expect(() => decide(command, existingState)).toThrow(
        "Rider rider-3 is not in heat heat-1"
      );
    });

    it("should throw error if score is below 0", () => {
      const command: AddWaveScore = {
        type: "AddWaveScore",
        data: {
          heatId: "heat-1",
          scoreUUID: "score-1",
          riderId: "rider-1",
          waveScore: -1,
          timestamp: new Date(),
        },
      };

      expect(() => decide(command, existingState)).toThrow(
        "Wave score must be between 0 and 10"
      );
    });

    it("should throw error if score is above 10", () => {
      const command: AddWaveScore = {
        type: "AddWaveScore",
        data: {
          heatId: "heat-1",
          scoreUUID: "score-1",
          riderId: "rider-1",
          waveScore: 11,
          timestamp: new Date(),
        },
      };

      expect(() => decide(command, existingState)).toThrow(
        "Wave score must be between 0 and 10"
      );
    });

    it("should throw error if scoreUUID already exists", () => {
      const stateWithScore: HeatState = {
        ...existingState,
        scores: [
          {
            type: "wave",
            scoreUUID: "score-1",
            riderId: "rider-1",
            score: 8.0,
            timestamp: new Date(),
          },
        ],
      };

      const command: AddWaveScore = {
        type: "AddWaveScore",
        data: {
          heatId: "heat-1",
          scoreUUID: "score-1",
          riderId: "rider-2",
          waveScore: 7.5,
          timestamp: new Date(),
        },
      };

      expect(() => decide(command, stateWithScore)).toThrow(
        "Score UUID score-1 already exists in heat"
      );
    });

    it("should accept score of 0", () => {
      const command: AddWaveScore = {
        type: "AddWaveScore",
        data: {
          heatId: "heat-1",
          scoreUUID: "score-1",
          riderId: "rider-1",
          waveScore: 0,
          timestamp: new Date(),
        },
      };

      const events = decide(command, existingState);
      expect(events).toHaveLength(1);
      expect(events[0].data.waveScore).toBe(0);
    });

    it("should accept score of 10", () => {
      const command: AddWaveScore = {
        type: "AddWaveScore",
        data: {
          heatId: "heat-1",
          scoreUUID: "score-1",
          riderId: "rider-1",
          waveScore: 10,
          timestamp: new Date(),
        },
      };

      const events = decide(command, existingState);
      expect(events).toHaveLength(1);
      expect(events[0].data.waveScore).toBe(10);
    });

    it("should throw error if score is NaN", () => {
      const command: AddWaveScore = {
        type: "AddWaveScore",
        data: {
          heatId: "heat-1",
          scoreUUID: "score-1",
          riderId: "rider-1",
          waveScore: NaN,
          timestamp: new Date(),
        },
      };

      expect(() => decide(command, existingState)).toThrow(
        "Wave score must be a valid number"
      );
    });

    it("should throw error if score is Infinity", () => {
      const command: AddWaveScore = {
        type: "AddWaveScore",
        data: {
          heatId: "heat-1",
          scoreUUID: "score-1",
          riderId: "rider-1",
          waveScore: Infinity,
          timestamp: new Date(),
        },
      };

      expect(() => decide(command, existingState)).toThrow(
        "Wave score must be a valid number"
      );
    });

    it("should throw error if score is -Infinity", () => {
      const command: AddWaveScore = {
        type: "AddWaveScore",
        data: {
          heatId: "heat-1",
          scoreUUID: "score-1",
          riderId: "rider-1",
          waveScore: -Infinity,
          timestamp: new Date(),
        },
      };

      expect(() => decide(command, existingState)).toThrow(
        "Wave score must be a valid number"
      );
    });
  });

  describe("decide - AddJumpScore", () => {
    const existingState: HeatState = {
      heatId: "heat-1",
      riderIds: ["rider-1", "rider-2"],
      heatRules: {
        wavesCounting: 2,
        jumpsCounting: 1,
      },
      scores: [],
    };

    it("should produce JumpScoreAdded event for valid command", () => {
      const command: AddJumpScore = {
        type: "AddJumpScore",
        data: {
          heatId: "heat-1",
          scoreUUID: "score-1",
          riderId: "rider-1",
          jumpScore: 9.0,
          jumpType: "forward",
          timestamp: new Date("2024-01-01T10:00:00Z"),
        },
      };

      const events = decide(command, existingState);

      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        type: "JumpScoreAdded",
        data: {
          heatId: "heat-1",
          scoreUUID: "score-1",
          riderId: "rider-1",
          jumpScore: 9.0,
          jumpType: "forward",
          timestamp: new Date("2024-01-01T10:00:00Z"),
        },
      });
    });

    it("should throw error if heat does not exist", () => {
      const command: AddJumpScore = {
        type: "AddJumpScore",
        data: {
          heatId: "heat-1",
          scoreUUID: "score-1",
          riderId: "rider-1",
          jumpScore: 9.0,
          jumpType: "forward",
          timestamp: new Date(),
        },
      };

      expect(() => decide(command, null)).toThrow(
        "Heat with id heat-1 does not exist"
      );
    });

    it("should throw error if rider is not in heat", () => {
      const command: AddJumpScore = {
        type: "AddJumpScore",
        data: {
          heatId: "heat-1",
          scoreUUID: "score-1",
          riderId: "rider-3",
          jumpScore: 9.0,
          jumpType: "forward",
          timestamp: new Date(),
        },
      };

      expect(() => decide(command, existingState)).toThrow(
        "Rider rider-3 is not in heat heat-1"
      );
    });

    it("should throw error if score is below 0", () => {
      const command: AddJumpScore = {
        type: "AddJumpScore",
        data: {
          heatId: "heat-1",
          scoreUUID: "score-1",
          riderId: "rider-1",
          jumpScore: -1,
          jumpType: "forward",
          timestamp: new Date(),
        },
      };

      expect(() => decide(command, existingState)).toThrow(
        "Jump score must be between 0 and 10"
      );
    });

    it("should throw error if score is above 10", () => {
      const command: AddJumpScore = {
        type: "AddJumpScore",
        data: {
          heatId: "heat-1",
          scoreUUID: "score-1",
          riderId: "rider-1",
          jumpScore: 11,
          jumpType: "forward",
          timestamp: new Date(),
        },
      };

      expect(() => decide(command, existingState)).toThrow(
        "Jump score must be between 0 and 10"
      );
    });

    it("should throw error if scoreUUID already exists", () => {
      const stateWithScore: HeatState = {
        ...existingState,
        scores: [
          {
            type: "jump",
            scoreUUID: "score-1",
            riderId: "rider-1",
            score: 8.0,
            jumpType: "forward",
            timestamp: new Date(),
          },
        ],
      };

      const command: AddJumpScore = {
        type: "AddJumpScore",
        data: {
          heatId: "heat-1",
          scoreUUID: "score-1",
          riderId: "rider-2",
          jumpScore: 7.5,
          jumpType: "backloop",
          timestamp: new Date(),
        },
      };

      expect(() => decide(command, stateWithScore)).toThrow(
        "Score UUID score-1 already exists in heat"
      );
    });

    it("should accept all valid jump types", () => {
      const jumpTypes = [
        "forward",
        "backloop",
        "doubleForward",
        "pushLoop",
        "pushForward",
        "tableTop",
        "cheeseRoll",
      ] as const;

      for (const jumpType of jumpTypes) {
        const command: AddJumpScore = {
          type: "AddJumpScore",
          data: {
            heatId: "heat-1",
            scoreUUID: `score-${jumpType}`,
            riderId: "rider-1",
            jumpScore: 8.0,
            jumpType,
            timestamp: new Date(),
          },
        };

        const events = decide(command, existingState);
        expect(events).toHaveLength(1);
        expect(events[0].data.jumpType).toBe(jumpType);
      }
    });

    it("should throw error if score is NaN", () => {
      const command: AddJumpScore = {
        type: "AddJumpScore",
        data: {
          heatId: "heat-1",
          scoreUUID: "score-1",
          riderId: "rider-1",
          jumpScore: NaN,
          jumpType: "forward",
          timestamp: new Date(),
        },
      };

      expect(() => decide(command, existingState)).toThrow(
        "Jump score must be a valid number"
      );
    });

    it("should throw error if score is Infinity", () => {
      const command: AddJumpScore = {
        type: "AddJumpScore",
        data: {
          heatId: "heat-1",
          scoreUUID: "score-1",
          riderId: "rider-1",
          jumpScore: Infinity,
          jumpType: "forward",
          timestamp: new Date(),
        },
      };

      expect(() => decide(command, existingState)).toThrow(
        "Jump score must be a valid number"
      );
    });

    it("should throw error if score is -Infinity", () => {
      const command: AddJumpScore = {
        type: "AddJumpScore",
        data: {
          heatId: "heat-1",
          scoreUUID: "score-1",
          riderId: "rider-1",
          jumpScore: -Infinity,
          jumpType: "forward",
          timestamp: new Date(),
        },
      };

      expect(() => decide(command, existingState)).toThrow(
        "Jump score must be a valid number"
      );
    });
  });

  describe("evolve - HeatCreated", () => {
    it("should create new heat state from HeatCreated event", () => {
      const event = {
        type: "HeatCreated" as const,
        data: {
          heatId: "heat-1",
          riderIds: ["rider-1", "rider-2"],
          heatRules: {
            wavesCounting: 2,
            jumpsCounting: 1,
          },
        },
      };

      const newState = evolve(null, event);

      expect(newState).toEqual({
        heatId: "heat-1",
        riderIds: ["rider-1", "rider-2"],
        heatRules: {
          wavesCounting: 2,
          jumpsCounting: 1,
        },
        scores: [],
      });
    });

    it("should create immutable copies of arrays and objects", () => {
      const event = {
        type: "HeatCreated" as const,
        data: {
          heatId: "heat-1",
          riderIds: ["rider-1"],
          heatRules: {
            wavesCounting: 2,
            jumpsCounting: 1,
          },
        },
      };

      const newState = evolve(null, event);
      const originalRiderIds = event.data.riderIds;
      const originalRules = event.data.heatRules;

      // Modify originals
      originalRiderIds.push("rider-2");
      originalRules.wavesCounting = 5;

      // State should not be affected
      expect(newState.riderIds).toEqual(["rider-1"]);
      expect(newState.heatRules.wavesCounting).toBe(2);
    });
  });

  describe("evolve - WaveScoreAdded", () => {
    const existingState: HeatState = {
      heatId: "heat-1",
      riderIds: ["rider-1", "rider-2"],
      heatRules: {
        wavesCounting: 2,
        jumpsCounting: 1,
      },
      scores: [],
    };

    it("should add wave score to state", () => {
      const event = {
        type: "WaveScoreAdded" as const,
        data: {
          heatId: "heat-1",
          scoreUUID: "score-1",
          riderId: "rider-1",
          waveScore: 8.5,
          timestamp: new Date("2024-01-01T10:00:00Z"),
        },
      };

      const newState = evolve(existingState, event);

      expect(newState.scores).toHaveLength(1);
      expect(newState.scores[0]).toEqual({
        type: "wave",
        scoreUUID: "score-1",
        riderId: "rider-1",
        score: 8.5,
        timestamp: new Date("2024-01-01T10:00:00Z"),
      });
    });

    it("should append multiple wave scores", () => {
      const event1 = {
        type: "WaveScoreAdded" as const,
        data: {
          heatId: "heat-1",
          scoreUUID: "score-1",
          riderId: "rider-1",
          waveScore: 8.5,
          timestamp: new Date("2024-01-01T10:00:00Z"),
        },
      };

      const state1 = evolve(existingState, event1);

      const event2 = {
        type: "WaveScoreAdded" as const,
        data: {
          heatId: "heat-1",
          scoreUUID: "score-2",
          riderId: "rider-2",
          waveScore: 9.0,
          timestamp: new Date("2024-01-01T10:05:00Z"),
        },
      };

      const state2 = evolve(state1, event2);

      expect(state2.scores).toHaveLength(2);
      expect(state2.scores[0].scoreUUID).toBe("score-1");
      expect(state2.scores[1].scoreUUID).toBe("score-2");
    });

    it("should throw error if state is null", () => {
      const event = {
        type: "WaveScoreAdded" as const,
        data: {
          heatId: "heat-1",
          scoreUUID: "score-1",
          riderId: "rider-1",
          waveScore: 8.5,
          timestamp: new Date(),
        },
      };

      expect(() => evolve(null, event)).toThrow(
        "Cannot add wave score to non-existent heat"
      );
    });

    it("should preserve existing scores when adding new one", () => {
      const stateWithScore: HeatState = {
        ...existingState,
        scores: [
          {
            type: "wave",
            scoreUUID: "score-1",
            riderId: "rider-1",
            score: 8.0,
            timestamp: new Date("2024-01-01T10:00:00Z"),
          },
        ],
      };

      const event = {
        type: "WaveScoreAdded" as const,
        data: {
          heatId: "heat-1",
          scoreUUID: "score-2",
          riderId: "rider-2",
          waveScore: 9.0,
          timestamp: new Date("2024-01-01T10:05:00Z"),
        },
      };

      const newState = evolve(stateWithScore, event);

      expect(newState.scores).toHaveLength(2);
      expect(newState.scores[0].scoreUUID).toBe("score-1");
      expect(newState.scores[1].scoreUUID).toBe("score-2");
    });
  });

  describe("evolve - JumpScoreAdded", () => {
    const existingState: HeatState = {
      heatId: "heat-1",
      riderIds: ["rider-1", "rider-2"],
      heatRules: {
        wavesCounting: 2,
        jumpsCounting: 1,
      },
      scores: [],
    };

    it("should add jump score to state", () => {
      const event = {
        type: "JumpScoreAdded" as const,
        data: {
          heatId: "heat-1",
          scoreUUID: "score-1",
          riderId: "rider-1",
          jumpScore: 9.0,
          jumpType: "forward",
          timestamp: new Date("2024-01-01T10:00:00Z"),
        },
      };

      const newState = evolve(existingState, event);

      expect(newState.scores).toHaveLength(1);
      expect(newState.scores[0]).toEqual({
        type: "jump",
        scoreUUID: "score-1",
        riderId: "rider-1",
        score: 9.0,
        jumpType: "forward",
        timestamp: new Date("2024-01-01T10:00:00Z"),
      });
    });

    it("should append multiple jump scores", () => {
      const event1 = {
        type: "JumpScoreAdded" as const,
        data: {
          heatId: "heat-1",
          scoreUUID: "score-1",
          riderId: "rider-1",
          jumpScore: 9.0,
          jumpType: "forward",
          timestamp: new Date("2024-01-01T10:00:00Z"),
        },
      };

      const state1 = evolve(existingState, event1);

      const event2 = {
        type: "JumpScoreAdded" as const,
        data: {
          heatId: "heat-1",
          scoreUUID: "score-2",
          riderId: "rider-2",
          jumpScore: 8.5,
          jumpType: "backloop",
          timestamp: new Date("2024-01-01T10:05:00Z"),
        },
      };

      const state2 = evolve(state1, event2);

      expect(state2.scores).toHaveLength(2);
      expect(state2.scores[0].scoreUUID).toBe("score-1");
      expect(state2.scores[1].scoreUUID).toBe("score-2");
    });

    it("should throw error if state is null", () => {
      const event = {
        type: "JumpScoreAdded" as const,
        data: {
          heatId: "heat-1",
          scoreUUID: "score-1",
          riderId: "rider-1",
          jumpScore: 9.0,
          jumpType: "forward",
          timestamp: new Date(),
        },
      };

      expect(() => evolve(null, event)).toThrow(
        "Cannot add jump score to non-existent heat"
      );
    });

    it("should handle all jump types", () => {
      const jumpTypes = [
        "forward",
        "backloop",
        "doubleForward",
        "pushLoop",
        "pushForward",
        "tableTop",
        "cheeseRoll",
      ] as const;

      let currentState = existingState;

      for (let i = 0; i < jumpTypes.length; i++) {
        const event = {
          type: "JumpScoreAdded" as const,
          data: {
            heatId: "heat-1",
            scoreUUID: `score-${i}`,
            riderId: "rider-1",
            jumpScore: 8.0,
            jumpType: jumpTypes[i],
            timestamp: new Date(),
          },
        };

        currentState = evolve(currentState, event);
      }

      expect(currentState.scores).toHaveLength(jumpTypes.length);
      currentState.scores.forEach((score, i) => {
        if (score.type === "jump") {
          expect(score.jumpType).toBe(jumpTypes[i]);
        }
      });
    });
  });

  describe("state reconstruction from event stream", () => {
    it("should reconstruct complete heat state from multiple events", () => {
      let state = initialState();

      // Create heat
      const createCommand: CreateHeat = {
        type: "CreateHeat",
        data: {
          heatId: "heat-1",
          riderIds: ["rider-1", "rider-2"],
          heatRules: {
            wavesCounting: 2,
            jumpsCounting: 1,
          },
        },
      };

      const createEvents = decide(createCommand, state);
      state = evolve(state, createEvents[0]);

      // Add wave scores
      const waveCommand1: AddWaveScore = {
        type: "AddWaveScore",
        data: {
          heatId: "heat-1",
          scoreUUID: "wave-1",
          riderId: "rider-1",
          waveScore: 8.5,
          timestamp: new Date("2024-01-01T10:00:00Z"),
        },
      };

      const waveEvents1 = decide(waveCommand1, state);
      state = evolve(state, waveEvents1[0]);

      const waveCommand2: AddWaveScore = {
        type: "AddWaveScore",
        data: {
          heatId: "heat-1",
          scoreUUID: "wave-2",
          riderId: "rider-2",
          waveScore: 9.0,
          timestamp: new Date("2024-01-01T10:05:00Z"),
        },
      };

      const waveEvents2 = decide(waveCommand2, state);
      state = evolve(state, waveEvents2[0]);

      // Add jump score
      const jumpCommand: AddJumpScore = {
        type: "AddJumpScore",
        data: {
          heatId: "heat-1",
          scoreUUID: "jump-1",
          riderId: "rider-1",
          jumpScore: 9.5,
          jumpType: "forward",
          timestamp: new Date("2024-01-01T10:10:00Z"),
        },
      };

      const jumpEvents = decide(jumpCommand, state);
      state = evolve(state, jumpEvents[0]);

      // Verify final state
      expect(state).not.toBeNull();
      if (state) {
        expect(state.heatId).toBe("heat-1");
        expect(state.riderIds).toEqual(["rider-1", "rider-2"]);
        expect(state.scores).toHaveLength(3);
        expect(state.scores[0].type).toBe("wave");
        expect(state.scores[1].type).toBe("wave");
        expect(state.scores[2].type).toBe("jump");
      }
    });
  });
});
