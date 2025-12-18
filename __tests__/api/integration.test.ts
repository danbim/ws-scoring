import { describe, it, expect, beforeEach } from "bun:test";
import {
  handleCreateHeat,
  handleAddWaveScore,
  handleAddJumpScore,
  handleGetHeat,
} from "../../src/api/routes.js";
import {
  addConnection,
  broadcastEvent,
  setSubscriptions,
  getSubscriptions,
} from "../../src/api/websocket.js";
import type { ServerWebSocket } from "bun";
import type {
  WaveScoreAdded,
  JumpScoreAdded,
} from "../../src/domain/heat/types.js";

// Mock WebSocket for testing
class MockWebSocket {
  readyState: "open" | "closed" = "open";
  sentMessages: string[] = [];
  subscriptions?: { events: boolean; state: boolean };
  private _data: { heatId?: string } = { heatId: "integration-heat" };

  send(message: string): void {
    this.sentMessages.push(message);
  }

  close(): void {
    this.readyState = "closed";
  }

  get data(): { heatId?: string } {
    return this._data;
  }

  setHeatId(heatId: string): void {
    this._data = { heatId };
  }
}

describe("API Integration Tests", () => {
  const heatId = "integration-heat";

  describe("REST API → WebSocket Broadcasting Flow", () => {
    it("should broadcast events to WebSocket clients when heat is created", async () => {
      const mockWs = new MockWebSocket() as unknown as ServerWebSocket<{
        heatId?: string;
      }>;
      (mockWs as unknown as { readyState: string }).readyState = "open";

      addConnection(heatId, mockWs);
      setSubscriptions(heatId, mockWs, { events: true, state: true });

      // Create heat via REST API
      const createRequest = new Request("http://localhost/api/heats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          heatId,
          riderIds: ["rider-1", "rider-2"],
          heatRules: {
            wavesCounting: 2,
            jumpsCounting: 1,
          },
        }),
      });

      const response = await handleCreateHeat(createRequest);
      expect(response.status).toBe(200);

      // Check that WebSocket client received messages
      const messages = (mockWs as unknown as MockWebSocket).sentMessages;
      expect(messages.length).toBeGreaterThan(0);

      // Should receive event message
      const eventMessage = messages.find((msg) => {
        const parsed = JSON.parse(msg as string);
        return parsed.type === "event" && parsed.event.type === "HeatCreated";
      });
      expect(eventMessage).toBeDefined();

      // Should receive state message
      const stateMessage = messages.find((msg) => {
        const parsed = JSON.parse(msg as string);
        return parsed.type === "state";
      });
      expect(stateMessage).toBeDefined();
    });

    it("should broadcast events to WebSocket clients when score is added", async () => {
      // Create heat first
      const createRequest = new Request("http://localhost/api/heats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          heatId,
          riderIds: ["rider-1"],
          heatRules: {
            wavesCounting: 2,
            jumpsCounting: 1,
          },
        }),
      });

      await handleCreateHeat(createRequest);

      // Set up WebSocket connection
      const mockWs = new MockWebSocket() as unknown as ServerWebSocket<{
        heatId?: string;
      }>;
      (mockWs as unknown as { readyState: string }).readyState = "open";

      addConnection(heatId, mockWs);
      setSubscriptions(heatId, mockWs, { events: true, state: true });

      // Clear previous messages
      (mockWs as unknown as MockWebSocket).sentMessages = [];

      // Add wave score via REST API
      const scoreRequest = new Request(
        `http://localhost/api/heats/${heatId}/scores/wave`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scoreUUID: "wave-1",
            riderId: "rider-1",
            waveScore: 8.5,
          }),
        }
      );

      const response = await handleAddWaveScore(scoreRequest, heatId);
      expect(response.status).toBe(200);

      // Check that WebSocket client received messages
      const messages = (mockWs as unknown as MockWebSocket).sentMessages;
      expect(messages.length).toBeGreaterThan(0);

      // Should receive event message
      const eventMessage = messages.find((msg) => {
        const parsed = JSON.parse(msg as string);
        return (
          parsed.type === "event" && parsed.event.type === "WaveScoreAdded"
        );
      });
      expect(eventMessage).toBeDefined();

      // Should receive state message with updated score
      const stateMessage = messages.find((msg) => {
        const parsed = JSON.parse(msg as string);
        return parsed.type === "state";
      });
      expect(stateMessage).toBeDefined();

      if (stateMessage) {
        const parsed = JSON.parse(stateMessage as string);
        expect(parsed.state.scores).toHaveLength(1);
        expect(parsed.state.scores[0]).toMatchObject({
          type: "wave",
          scoreUUID: "wave-1",
          riderId: "rider-1",
          score: 8.5,
        });
      }
    });

    it("should update heat state correctly after multiple score additions", async () => {
      // Create heat
      const createRequest = new Request("http://localhost/api/heats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          heatId,
          riderIds: ["rider-1", "rider-2"],
          heatRules: {
            wavesCounting: 2,
            jumpsCounting: 1,
          },
        }),
      });

      await handleCreateHeat(createRequest);

      // Add multiple scores
      const waveScore1 = new Request(
        `http://localhost/api/heats/${heatId}/scores/wave`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scoreUUID: "wave-1",
            riderId: "rider-1",
            waveScore: 8.5,
          }),
        }
      );

      await handleAddWaveScore(waveScore1, heatId);

      const waveScore2 = new Request(
        `http://localhost/api/heats/${heatId}/scores/wave`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scoreUUID: "wave-2",
            riderId: "rider-2",
            waveScore: 9.0,
          }),
        }
      );

      await handleAddWaveScore(waveScore2, heatId);

      const jumpScore = new Request(
        `http://localhost/api/heats/${heatId}/scores/jump`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scoreUUID: "jump-1",
            riderId: "rider-1",
            jumpScore: 9.5,
            jumpType: "forward",
          }),
        }
      );

      await handleAddJumpScore(jumpScore, heatId);

      // Get final state via REST API
      const getResponse = await handleGetHeat(heatId);
      expect(getResponse.status).toBe(200);

      const state = (await getResponse.json()) as {
        heatId: string;
        scores: Array<{
          type: string;
          scoreUUID: string;
          riderId: string;
          score: number;
        }>;
      };

      expect(state.scores).toHaveLength(3);
      expect(state.scores.find((s) => s.scoreUUID === "wave-1")).toBeDefined();
      expect(state.scores.find((s) => s.scoreUUID === "wave-2")).toBeDefined();
      expect(state.scores.find((s) => s.scoreUUID === "jump-1")).toBeDefined();
    });

    it("should only send events to clients subscribed to events", async () => {
      const testHeatId = `integration-heat-events-${Date.now()}`;
      const mockWsEventsBase = new MockWebSocket();
      mockWsEventsBase.setHeatId(testHeatId);
      const mockWsEvents = mockWsEventsBase as unknown as ServerWebSocket<{
        heatId?: string;
      }>;
      mockWsEventsBase.readyState = "open";

      const mockWsStateBase = new MockWebSocket();
      mockWsStateBase.setHeatId(testHeatId);
      const mockWsState = mockWsStateBase as unknown as ServerWebSocket<{
        heatId?: string;
      }>;
      mockWsStateBase.readyState = "open";

      addConnection(testHeatId, mockWsEvents);
      addConnection(testHeatId, mockWsState);

      setSubscriptions(testHeatId, mockWsEvents, {
        events: true,
        state: false,
      });
      setSubscriptions(testHeatId, mockWsState, { events: false, state: true });

      // Create heat
      const createRequest = new Request("http://localhost/api/heats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          heatId: testHeatId,
          riderIds: ["rider-1"],
          heatRules: {
            wavesCounting: 2,
            jumpsCounting: 1,
          },
        }),
      });

      await handleCreateHeat(createRequest);

      // Check messages - wait a bit for async operations
      await new Promise((resolve) => setTimeout(resolve, 10));

      const eventsMessages = mockWsEventsBase.sentMessages;
      const stateMessages = mockWsStateBase.sentMessages;

      // Events-only client should receive event messages
      const eventReceived = eventsMessages.some((msg) => {
        try {
          const parsed = JSON.parse(msg as string);
          return parsed.type === "event";
        } catch {
          return false;
        }
      });
      expect(eventReceived).toBe(true);

      // State-only client should receive state messages
      const stateReceived = stateMessages.some((msg) => {
        try {
          const parsed = JSON.parse(msg as string);
          return parsed.type === "state";
        } catch {
          return false;
        }
      });
      expect(stateReceived).toBe(true);
    });
  });
});
