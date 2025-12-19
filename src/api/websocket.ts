// WebSocket connection management and broadcasting
import type { ServerWebSocket } from "bun";
import type { HeatEvent } from "../domain/heat/types.js";
import { aggregateHeatState } from "./helpers.js";
import type {
  ClientSubscription,
  WebSocketClientMessage,
  WebSocketServerMessage,
} from "./types.js";

// Connection map: heatId -> Set of WebSocket connections
type WebSocketConnection = ServerWebSocket<{ heatId?: string }> & {
  subscriptions?: ClientSubscription;
};

const connections = new Map<string, Set<WebSocketConnection>>();

// Heartbeat interval (send ping every 30 seconds)
const HEARTBEAT_INTERVAL = 30000;

export function addConnection(heatId: string, ws: ServerWebSocket<{ heatId?: string }>): void {
  if (!connections.has(heatId)) {
    connections.set(heatId, new Set());
  }
  const connection = ws as WebSocketConnection;
  const heatConnections = connections.get(heatId);
  if (heatConnections) {
    heatConnections.add(connection);
  }

  // Set up heartbeat
  const heartbeatInterval = setInterval(() => {
    if (ws.readyState === "open") {
      try {
        ws.send(JSON.stringify({ type: "ping" }));
      } catch (_error) {
        // Connection closed, cleanup will happen in removeConnection
      }
    } else {
      clearInterval(heartbeatInterval);
    }
  }, HEARTBEAT_INTERVAL);

  // Store interval ID for cleanup
  (connection as unknown as { _heartbeatInterval?: number })._heartbeatInterval = heartbeatInterval;
}

export function removeConnection(heatId: string, ws: ServerWebSocket<{ heatId?: string }>): void {
  const heatConnections = connections.get(heatId);
  if (heatConnections) {
    const connection = ws as WebSocketConnection;
    heatConnections.delete(connection);

    // Clean up heartbeat interval
    const intervalId = (connection as unknown as { _heartbeatInterval?: number })
      ._heartbeatInterval;
    if (intervalId) {
      clearInterval(intervalId);
    }

    // Clean up empty sets
    if (heatConnections.size === 0) {
      connections.delete(heatId);
    }
  }
}

export function setSubscriptions(
  heatId: string,
  ws: ServerWebSocket<{ heatId?: string }>,
  subscriptions: ClientSubscription
): void {
  const heatConnections = connections.get(heatId);
  if (heatConnections) {
    const connection = Array.from(heatConnections).find((c) => c === ws);
    if (connection) {
      connection.subscriptions = subscriptions;
    }
  }
}

export function getSubscriptions(
  heatId: string,
  ws: ServerWebSocket<{ heatId?: string }>
): ClientSubscription | undefined {
  const heatConnections = connections.get(heatId);
  if (heatConnections) {
    const connection = Array.from(heatConnections).find((c) => c === ws);
    return connection?.subscriptions;
  }
  return undefined;
}

export async function broadcastEvent(heatId: string, event: HeatEvent): Promise<void> {
  const heatConnections = connections.get(heatId);
  if (!heatConnections || heatConnections.size === 0) {
    return;
  }

  const eventMessage: WebSocketServerMessage = {
    type: "event",
    event: {
      type: event.type,
      data: event.data,
    },
  };

  const eventMessageJson = JSON.stringify(eventMessage);

  // Send event to subscribers
  for (const ws of heatConnections) {
    if (ws.readyState === "open" && ws.subscriptions?.events) {
      try {
        ws.send(eventMessageJson);
      } catch (_error) {
        // Connection might be closed, remove it
        removeConnection(heatId, ws);
      }
    }
  }

  // If any client is subscribed to state updates, send state snapshot
  const hasStateSubscribers = Array.from(heatConnections).some(
    (ws) => ws.readyState === "open" && ws.subscriptions?.state
  );

  if (hasStateSubscribers) {
    const state = await aggregateHeatState(heatId);
    if (state) {
      const stateMessage: WebSocketServerMessage = {
        type: "state",
        state,
      };
      const stateMessageJson = JSON.stringify(stateMessage);

      for (const ws of heatConnections) {
        if (ws.readyState === "open" && ws.subscriptions?.state) {
          try {
            ws.send(stateMessageJson);
          } catch (_error) {
            // Connection might be closed, remove it
            removeConnection(heatId, ws);
          }
        }
      }
    }
  }
}

export function handleWebSocketMessage(
  heatId: string,
  ws: ServerWebSocket<{ heatId?: string }>,
  message: string
): void {
  try {
    const parsed = JSON.parse(message) as WebSocketClientMessage;

    switch (parsed.type) {
      case "subscribe": {
        const subscriptions: ClientSubscription = {
          events: parsed.subscriptions.includes("events"),
          state: parsed.subscriptions.includes("state"),
        };
        setSubscriptions(heatId, ws, subscriptions);
        break;
      }
      case "pong": {
        // Heartbeat response - no action needed
        break;
      }
      default: {
        // Unknown message type - ignore
        break;
      }
    }
  } catch (_error) {
    // Invalid JSON or message format - ignore
  }
}
