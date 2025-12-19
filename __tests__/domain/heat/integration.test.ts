import { beforeEach, describe, expect, it } from "bun:test";
import { getInMemoryEventStore } from "@event-driven-io/emmett";
import {
  type AddJumpScore,
  type AddWaveScore,
  type CreateHeat,
  decide,
  evolve,
  type HeatState,
  initialState,
} from "../../../src/domain/heat/index.js";

describe("Heat Integration Tests", () => {
  let eventStore: ReturnType<typeof getInMemoryEventStore>;

  beforeEach(() => {
    eventStore = getInMemoryEventStore();
  });

  function getStreamName(heatId: string): string {
    return `heat-${heatId}`;
  }

  async function aggregateHeatState(heatId: string): Promise<HeatState | null> {
    const result = await eventStore.aggregateStream(getStreamName(heatId), {
      evolve,
      initialState,
    });

    return result.state;
  }

  describe("Full command → event → state flow", () => {
    it("should create heat and reconstruct state from events", async () => {
      const heatId = "heat-1";
      const streamName = getStreamName(heatId);

      // Create heat command
      const createCommand: CreateHeat = {
        type: "CreateHeat",
        data: {
          heatId,
          riderIds: ["rider-1", "rider-2"],
          heatRules: {
            wavesCounting: 2,
            jumpsCounting: 1,
          },
        },
      };

      // Get current state (should be null)
      let currentState = await aggregateHeatState(heatId);
      expect(currentState).toBeNull();

      // Decide on command
      const events = decide(createCommand, currentState);
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe("HeatCreated");

      // Append events to stream
      await eventStore.appendToStream(streamName, events);

      // Reconstruct state from events
      currentState = await aggregateHeatState(heatId);
      expect(currentState).not.toBeNull();
      if (currentState) {
        expect(currentState.heatId).toBe(heatId);
        expect(currentState.riderIds).toEqual(["rider-1", "rider-2"]);
        expect(currentState.heatRules).toEqual({
          wavesCounting: 2,
          jumpsCounting: 1,
        });
        expect(currentState.scores).toHaveLength(0);
      }
    });

    it("should add wave score and reconstruct state", async () => {
      const heatId = "heat-1";
      const streamName = getStreamName(heatId);

      // Create heat first
      const createCommand: CreateHeat = {
        type: "CreateHeat",
        data: {
          heatId,
          riderIds: ["rider-1", "rider-2"],
          heatRules: {
            wavesCounting: 2,
            jumpsCounting: 1,
          },
        },
      };

      let currentState = await aggregateHeatState(heatId);
      const createEvents = decide(createCommand, currentState);
      await eventStore.appendToStream(streamName, createEvents);

      // Add wave score
      const waveCommand: AddWaveScore = {
        type: "AddWaveScore",
        data: {
          heatId,
          scoreUUID: "wave-1",
          riderId: "rider-1",
          waveScore: 8.5,
          timestamp: new Date("2024-01-01T10:00:00Z"),
        },
      };

      currentState = await aggregateHeatState(heatId);
      const waveEvents = decide(waveCommand, currentState);
      expect(waveEvents).toHaveLength(1);
      expect(waveEvents[0].type).toBe("WaveScoreAdded");

      await eventStore.appendToStream(streamName, waveEvents);

      // Reconstruct state
      currentState = await aggregateHeatState(heatId);
      expect(currentState).not.toBeNull();
      if (currentState) {
        expect(currentState.scores).toHaveLength(1);
        expect(currentState.scores[0].type).toBe("wave");
        if (currentState.scores[0].type === "wave") {
          expect(currentState.scores[0].scoreUUID).toBe("wave-1");
          expect(currentState.scores[0].riderId).toBe("rider-1");
          expect(currentState.scores[0].score).toBe(8.5);
        }
      }
    });

    it("should add jump score and reconstruct state", async () => {
      const heatId = "heat-1";
      const streamName = getStreamName(heatId);

      // Create heat first
      const createCommand: CreateHeat = {
        type: "CreateHeat",
        data: {
          heatId,
          riderIds: ["rider-1", "rider-2"],
          heatRules: {
            wavesCounting: 2,
            jumpsCounting: 1,
          },
        },
      };

      let currentState = await aggregateHeatState(heatId);
      const createEvents = decide(createCommand, currentState);
      await eventStore.appendToStream(streamName, createEvents);

      // Add jump score
      const jumpCommand: AddJumpScore = {
        type: "AddJumpScore",
        data: {
          heatId,
          scoreUUID: "jump-1",
          riderId: "rider-1",
          jumpScore: 9.0,
          jumpType: "forward",
          timestamp: new Date("2024-01-01T10:00:00Z"),
        },
      };

      currentState = await aggregateHeatState(heatId);
      const jumpEvents = decide(jumpCommand, currentState);
      expect(jumpEvents).toHaveLength(1);
      expect(jumpEvents[0].type).toBe("JumpScoreAdded");

      await eventStore.appendToStream(streamName, jumpEvents);

      // Reconstruct state
      currentState = await aggregateHeatState(heatId);
      expect(currentState).not.toBeNull();
      if (currentState) {
        expect(currentState.scores).toHaveLength(1);
        expect(currentState.scores[0].type).toBe("jump");
        if (currentState.scores[0].type === "jump") {
          expect(currentState.scores[0].scoreUUID).toBe("jump-1");
          expect(currentState.scores[0].riderId).toBe("rider-1");
          expect(currentState.scores[0].score).toBe(9.0);
          expect(currentState.scores[0].jumpType).toBe("forward");
        }
      }
    });

    it("should handle multiple scores for same heat", async () => {
      const heatId = "heat-1";
      const streamName = getStreamName(heatId);

      // Create heat
      const createCommand: CreateHeat = {
        type: "CreateHeat",
        data: {
          heatId,
          riderIds: ["rider-1", "rider-2"],
          heatRules: {
            wavesCounting: 2,
            jumpsCounting: 1,
          },
        },
      };

      let currentState = await aggregateHeatState(heatId);
      const createEvents = decide(createCommand, currentState);
      await eventStore.appendToStream(streamName, createEvents);

      // Add multiple wave scores
      const waveCommands: AddWaveScore[] = [
        {
          type: "AddWaveScore",
          data: {
            heatId,
            scoreUUID: "wave-1",
            riderId: "rider-1",
            waveScore: 8.5,
            timestamp: new Date("2024-01-01T10:00:00Z"),
          },
        },
        {
          type: "AddWaveScore",
          data: {
            heatId,
            scoreUUID: "wave-2",
            riderId: "rider-2",
            waveScore: 9.0,
            timestamp: new Date("2024-01-01T10:05:00Z"),
          },
        },
        {
          type: "AddWaveScore",
          data: {
            heatId,
            scoreUUID: "wave-3",
            riderId: "rider-1",
            waveScore: 7.5,
            timestamp: new Date("2024-01-01T10:10:00Z"),
          },
        },
      ];

      for (const waveCommand of waveCommands) {
        currentState = await aggregateHeatState(heatId);
        const waveEvents = decide(waveCommand, currentState);
        await eventStore.appendToStream(streamName, waveEvents);
      }

      // Add jump score
      const jumpCommand: AddJumpScore = {
        type: "AddJumpScore",
        data: {
          heatId,
          scoreUUID: "jump-1",
          riderId: "rider-1",
          jumpScore: 9.5,
          jumpType: "forward",
          timestamp: new Date("2024-01-01T10:15:00Z"),
        },
      };

      currentState = await aggregateHeatState(heatId);
      const jumpEvents = decide(jumpCommand, currentState);
      await eventStore.appendToStream(streamName, jumpEvents);

      // Verify final state
      currentState = await aggregateHeatState(heatId);
      expect(currentState).not.toBeNull();
      if (currentState) {
        expect(currentState.scores).toHaveLength(4);
        expect(currentState.scores.filter((s) => s.type === "wave")).toHaveLength(3);
        expect(currentState.scores.filter((s) => s.type === "jump")).toHaveLength(1);
      }
    });

    it("should handle multiple riders scoring in same heat", async () => {
      const heatId = "heat-1";
      const streamName = getStreamName(heatId);

      // Create heat with multiple riders
      const createCommand: CreateHeat = {
        type: "CreateHeat",
        data: {
          heatId,
          riderIds: ["rider-1", "rider-2", "rider-3"],
          heatRules: {
            wavesCounting: 2,
            jumpsCounting: 1,
          },
        },
      };

      let currentState = await aggregateHeatState(heatId);
      const createEvents = decide(createCommand, currentState);
      await eventStore.appendToStream(streamName, createEvents);

      // Each rider adds scores
      const scores = [
        {
          type: "AddWaveScore" as const,
          data: {
            heatId,
            scoreUUID: "wave-r1-1",
            riderId: "rider-1",
            waveScore: 8.5,
            timestamp: new Date("2024-01-01T10:00:00Z"),
          },
        },
        {
          type: "AddWaveScore" as const,
          data: {
            heatId,
            scoreUUID: "wave-r2-1",
            riderId: "rider-2",
            waveScore: 9.0,
            timestamp: new Date("2024-01-01T10:01:00Z"),
          },
        },
        {
          type: "AddJumpScore" as const,
          data: {
            heatId,
            scoreUUID: "jump-r3-1",
            riderId: "rider-3",
            jumpScore: 8.0,
            jumpType: "backloop" as const,
            timestamp: new Date("2024-01-01T10:02:00Z"),
          },
        },
      ];

      for (const scoreCommand of scores) {
        currentState = await aggregateHeatState(heatId);
        const events = decide(scoreCommand, currentState);
        await eventStore.appendToStream(streamName, events);
      }

      // Verify all riders' scores are present
      currentState = await aggregateHeatState(heatId);
      expect(currentState).not.toBeNull();
      if (currentState) {
        expect(currentState.scores).toHaveLength(3);
        const riderIds = new Set(currentState.scores.map((s) => s.riderId));
        expect(riderIds).toContain("rider-1");
        expect(riderIds).toContain("rider-2");
        expect(riderIds).toContain("rider-3");
      }
    });
  });

  describe("Edge cases", () => {
    it("should prevent duplicate scoreUUIDs", async () => {
      const heatId = "heat-1";
      const streamName = getStreamName(heatId);

      // Create heat
      const createCommand: CreateHeat = {
        type: "CreateHeat",
        data: {
          heatId,
          riderIds: ["rider-1"],
          heatRules: {
            wavesCounting: 2,
            jumpsCounting: 1,
          },
        },
      };

      let currentState = await aggregateHeatState(heatId);
      const createEvents = decide(createCommand, currentState);
      await eventStore.appendToStream(streamName, createEvents);

      // Add first score
      const waveCommand1: AddWaveScore = {
        type: "AddWaveScore",
        data: {
          heatId,
          scoreUUID: "score-1",
          riderId: "rider-1",
          waveScore: 8.5,
          timestamp: new Date(),
        },
      };

      currentState = await aggregateHeatState(heatId);
      const waveEvents1 = decide(waveCommand1, currentState);
      await eventStore.appendToStream(streamName, waveEvents1);

      // Try to add duplicate scoreUUID
      const waveCommand2: AddWaveScore = {
        type: "AddWaveScore",
        data: {
          heatId,
          scoreUUID: "score-1", // Duplicate!
          riderId: "rider-1",
          waveScore: 9.0,
          timestamp: new Date(),
        },
      };

      currentState = await aggregateHeatState(heatId);
      expect(() => decide(waveCommand2, currentState)).toThrow(
        "Score UUID score-1 already exists in heat"
      );
    });

    it("should read events from stream in correct order", async () => {
      const heatId = "heat-1";
      const streamName = getStreamName(heatId);

      // Create heat and add multiple scores
      const createCommand: CreateHeat = {
        type: "CreateHeat",
        data: {
          heatId,
          riderIds: ["rider-1"],
          heatRules: {
            wavesCounting: 2,
            jumpsCounting: 1,
          },
        },
      };

      let currentState = await aggregateHeatState(heatId);
      const createEvents = decide(createCommand, currentState);
      await eventStore.appendToStream(streamName, createEvents);

      const waveCommands: AddWaveScore[] = [
        {
          type: "AddWaveScore",
          data: {
            heatId,
            scoreUUID: "wave-1",
            riderId: "rider-1",
            waveScore: 8.0,
            timestamp: new Date("2024-01-01T10:00:00Z"),
          },
        },
        {
          type: "AddWaveScore",
          data: {
            heatId,
            scoreUUID: "wave-2",
            riderId: "rider-1",
            waveScore: 9.0,
            timestamp: new Date("2024-01-01T10:05:00Z"),
          },
        },
      ];

      for (const waveCommand of waveCommands) {
        currentState = await aggregateHeatState(heatId);
        const waveEvents = decide(waveCommand, currentState);
        await eventStore.appendToStream(streamName, waveEvents);
      }

      // Read events from stream
      const readResult = await eventStore.readStream(streamName);
      expect(readResult.events).toHaveLength(3); // 1 create + 2 wave scores
      expect(readResult.events[0].type).toBe("HeatCreated");
      expect(readResult.events[1].type).toBe("WaveScoreAdded");
      expect(readResult.events[2].type).toBe("WaveScoreAdded");

      // Verify events are in correct order by reconstructing state
      currentState = await aggregateHeatState(heatId);
      expect(currentState).not.toBeNull();
      if (currentState) {
        expect(currentState.scores).toHaveLength(2);
        expect(currentState.scores[0].scoreUUID).toBe("wave-1");
        expect(currentState.scores[1].scoreUUID).toBe("wave-2");
      }
    });

    it("should handle reconstruction from empty stream", async () => {
      const heatId = "heat-1";
      const state = await aggregateHeatState(heatId);
      expect(state).toBeNull();
    });
  });
});
