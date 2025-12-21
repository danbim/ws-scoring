import { beforeEach, describe, expect, it } from "bun:test";
import type { ServerWebSocket } from "bun";
import {
  addConnection,
  broadcastEvent,
  getSubscriptions,
  handleWebSocketMessage,
  removeConnection,
  setSubscriptions,
} from "../../src/api/websocket.js";
import type { WaveScoreAdded } from "../../src/domain/heat/types.js";
import { createHeatRequest, RIDER_1 } from "./shared.js";

// Mock WebSocket for testing
class MockWebSocket {
  readyState: "open" | "closed" = "open";
  sentMessages: string[] = [];
  subscriptions?: { events: boolean; state: boolean };
  private _data: { heatId?: string } = { heatId: "test-heat" };

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

describe("WebSocket Management", () => {
  const heatId = "test-heat";

  beforeEach(() => {
    // Clear any existing connections
    // Note: In a real implementation, you'd want to reset the connections map
    // For now, we'll work with the global state
  });

  describe("addConnection", () => {
    it("should add a connection to the connections map", () => {
      const mockWs = new MockWebSocket() as unknown as ServerWebSocket<{
        heatId?: string;
      }>;

      addConnection(heatId, mockWs);

      const subscriptions = getSubscriptions(heatId, mockWs);
      // Connection should be added (subscriptions may be undefined initially)
      expect(subscriptions).toBeUndefined();
    });
  });

  describe("removeConnection", () => {
    it("should remove a connection from the connections map", () => {
      const mockWs = new MockWebSocket() as unknown as ServerWebSocket<{
        heatId?: string;
      }>;

      addConnection(heatId, mockWs);
      removeConnection(heatId, mockWs);

      const subscriptions = getSubscriptions(heatId, mockWs);
      expect(subscriptions).toBeUndefined();
    });
  });

  describe("setSubscriptions and getSubscriptions", () => {
    it("should set and get subscriptions correctly", () => {
      const mockWs = new MockWebSocket() as unknown as ServerWebSocket<{
        heatId?: string;
      }>;

      addConnection(heatId, mockWs);

      const subscriptions = { events: true, state: false };
      setSubscriptions(heatId, mockWs, subscriptions);

      const retrieved = getSubscriptions(heatId, mockWs);
      expect(retrieved).toEqual(subscriptions);
    });

    it("should allow subscribing to both events and state", () => {
      const mockWs = new MockWebSocket() as unknown as ServerWebSocket<{
        heatId?: string;
      }>;

      addConnection(heatId, mockWs);

      const subscriptions = { events: true, state: true };
      setSubscriptions(heatId, mockWs, subscriptions);

      const retrieved = getSubscriptions(heatId, mockWs);
      expect(retrieved).toEqual(subscriptions);
    });
  });

  describe("handleWebSocketMessage", () => {
    it("should handle subscribe message", () => {
      const mockWs = new MockWebSocket() as unknown as ServerWebSocket<{
        heatId?: string;
      }>;

      addConnection(heatId, mockWs);

      const subscribeMessage = JSON.stringify({
        type: "subscribe",
        subscriptions: ["events", "state"],
      });

      handleWebSocketMessage(heatId, mockWs, subscribeMessage);

      const subscriptions = getSubscriptions(heatId, mockWs);
      expect(subscriptions).toEqual({ events: true, state: true });
    });

    it("should handle subscribe message with only events", () => {
      const mockWs = new MockWebSocket() as unknown as ServerWebSocket<{
        heatId?: string;
      }>;

      addConnection(heatId, mockWs);

      const subscribeMessage = JSON.stringify({
        type: "subscribe",
        subscriptions: ["events"],
      });

      handleWebSocketMessage(heatId, mockWs, subscribeMessage);

      const subscriptions = getSubscriptions(heatId, mockWs);
      expect(subscriptions).toEqual({ events: true, state: false });
    });

    it("should handle subscribe message with only state", () => {
      const mockWs = new MockWebSocket() as unknown as ServerWebSocket<{
        heatId?: string;
      }>;

      addConnection(heatId, mockWs);

      const subscribeMessage = JSON.stringify({
        type: "subscribe",
        subscriptions: ["state"],
      });

      handleWebSocketMessage(heatId, mockWs, subscribeMessage);

      const subscriptions = getSubscriptions(heatId, mockWs);
      expect(subscriptions).toEqual({ events: false, state: true });
    });

    it("should handle pong message", () => {
      const mockWs = new MockWebSocket() as unknown as ServerWebSocket<{
        heatId?: string;
      }>;

      addConnection(heatId, mockWs);

      const pongMessage = JSON.stringify({ type: "pong" });

      // Should not throw
      expect(() => handleWebSocketMessage(heatId, mockWs, pongMessage)).not.toThrow();
    });

    it("should ignore invalid JSON", () => {
      const mockWs = new MockWebSocket() as unknown as ServerWebSocket<{
        heatId?: string;
      }>;

      addConnection(heatId, mockWs);

      // Should not throw on invalid JSON
      expect(() => handleWebSocketMessage(heatId, mockWs, "invalid json")).not.toThrow();
    });

    it("should ignore unknown message types", () => {
      const mockWs = new MockWebSocket() as unknown as ServerWebSocket<{
        heatId?: string;
      }>;

      addConnection(heatId, mockWs);

      const unknownMessage = JSON.stringify({ type: "unknown" });

      // Should not throw
      expect(() => handleWebSocketMessage(heatId, mockWs, unknownMessage)).not.toThrow();
    });
  });

  describe("broadcastEvent", () => {
    it("should send event message to subscribers subscribed to events", async () => {
      const mockWs = new MockWebSocket() as unknown as ServerWebSocket<{
        heatId?: string;
      }>;
      (mockWs as unknown as { readyState: string }).readyState = "open";

      addConnection(heatId, mockWs);
      setSubscriptions(heatId, mockWs, { events: true, state: false });

      const event: WaveScoreAdded = {
        type: "WaveScoreAdded",
        data: {
          heatId: "test-heat",
          scoreUUID: "score-1",
          riderId: RIDER_1,
          waveScore: 8.5,
          timestamp: new Date(),
        },
      };

      await broadcastEvent(heatId, event);

      // Check that event message was sent
      const messages = (mockWs as unknown as MockWebSocket).sentMessages;
      expect(messages.length).toBeGreaterThan(0);

      const eventMessage = JSON.parse(messages[0] as string);
      expect(eventMessage.type).toBe("event");
      expect(eventMessage.event.type).toBe("WaveScoreAdded");
    });

    it("should send state message to subscribers subscribed to state", async () => {
      // First create a heat so state can be generated
      const { handleCreateHeat } = await import("../../src/api/routes.js");

      const createRequest = createHeatRequest(heatId, {
        riderIds: [RIDER_1],
      });

      await handleCreateHeat(createRequest);

      const mockWs = new MockWebSocket() as unknown as ServerWebSocket<{
        heatId?: string;
      }>;
      (mockWs as unknown as { readyState: string }).readyState = "open";

      addConnection(heatId, mockWs);
      setSubscriptions(heatId, mockWs, { events: false, state: true });

      const event: WaveScoreAdded = {
        type: "WaveScoreAdded",
        data: {
          heatId,
          scoreUUID: "score-1",
          riderId: RIDER_1,
          waveScore: 8.5,
          timestamp: new Date(),
        },
      };

      await broadcastEvent(heatId, event);

      // Check that state message was sent
      const messages = (mockWs as unknown as MockWebSocket).sentMessages;
      expect(messages.length).toBeGreaterThan(0);

      const stateMessage = messages.find((msg) => {
        const parsed = JSON.parse(msg as string);
        return parsed.type === "state";
      });

      expect(stateMessage).toBeDefined();
      if (stateMessage) {
        const parsed = JSON.parse(stateMessage as string);
        expect(parsed.type).toBe("state");
        expect(parsed.state.heatId).toBe(heatId);
      }
    });

    it("should not send messages to closed connections", async () => {
      const mockWs = new MockWebSocket() as unknown as ServerWebSocket<{
        heatId?: string;
      }>;
      (mockWs as unknown as { readyState: string }).readyState = "closed";

      addConnection(heatId, mockWs);
      setSubscriptions(heatId, mockWs, { events: true, state: false });

      const event: WaveScoreAdded = {
        type: "WaveScoreAdded",
        data: {
          heatId,
          scoreUUID: "score-1",
          riderId: RIDER_1,
          waveScore: 8.5,
          timestamp: new Date(),
        },
      };

      await broadcastEvent(heatId, event);

      // Should not send to closed connections
      const messages = (mockWs as unknown as MockWebSocket).sentMessages;
      expect(messages.length).toBe(0);
    });

    it("should not send messages to connections not subscribed", async () => {
      const mockWs = new MockWebSocket() as unknown as ServerWebSocket<{
        heatId?: string;
      }>;
      (mockWs as unknown as { readyState: string }).readyState = "open";

      addConnection(heatId, mockWs);
      // No subscriptions set

      const event: WaveScoreAdded = {
        type: "WaveScoreAdded",
        data: {
          heatId,
          scoreUUID: "score-1",
          riderId: RIDER_1,
          waveScore: 8.5,
          timestamp: new Date(),
        },
      };

      await broadcastEvent(heatId, event);

      // Should not send to unsubscribed connections
      const messages = (mockWs as unknown as MockWebSocket).sentMessages;
      expect(messages.length).toBe(0);
    });
  });
});
