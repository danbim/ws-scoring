// WebSocket connection management and broadcasting
import type { ServerWebSocket } from "bun";
import { buildHeatViewerState } from "../domain/heat/index.js";
import type { JumpModifier, JumpType } from "../domain/heat/types.js";
import { getDb } from "../infrastructure/db/index.js";
import {
  createHeatRepository,
  createRiderRepository,
  createScoreRepository,
} from "../infrastructure/repositories/index.js";
import type {
  ClientSubscription,
  WebSocketClientMessage,
  WebSocketServerMessage,
} from "./types.js";

// Connection map: heatId -> Set of WebSocket connections
type WebSocketConnection = ServerWebSocket<{ heatId?: string }>;

const connections = new Map<string, Set<WebSocketConnection>>();
// Separate map to store client subscriptions (since ServerWebSocket has its own subscriptions property)
const subscriptions = new Map<WebSocketConnection, ClientSubscription>();

// Heartbeat interval (send ping every 30 seconds)
const HEARTBEAT_INTERVAL = 30000;

export function addConnection(heatId: string, ws: ServerWebSocket<{ heatId?: string }>): void {
  if (!connections.has(heatId)) {
    connections.set(heatId, new Set());
  }
  const heatConnections = connections.get(heatId);
  if (heatConnections) {
    heatConnections.add(ws);
  }

  // Set up heartbeat
  const heartbeatInterval = setInterval(() => {
    if (isWebSocketOpen(ws)) {
      try {
        ws.send(JSON.stringify({ type: "ping" }));
      } catch (_error) {
        // Connection closed, cleanup will happen in removeConnection
      }
    } else {
      clearInterval(heartbeatInterval);
    }
  }, HEARTBEAT_INTERVAL);

  // Store interval ID for cleanup (Timer type in Bun)
  (ws as unknown as { _heartbeatInterval?: ReturnType<typeof setInterval> })._heartbeatInterval =
    heartbeatInterval;
}

export function removeConnection(heatId: string, ws: ServerWebSocket<{ heatId?: string }>): void {
  const heatConnections = connections.get(heatId);
  if (heatConnections) {
    heatConnections.delete(ws);

    // Clean up heartbeat interval
    const intervalId = (ws as unknown as { _heartbeatInterval?: ReturnType<typeof setInterval> })
      ._heartbeatInterval;
    if (intervalId) {
      clearInterval(intervalId);
    }

    // Clean up subscriptions
    subscriptions.delete(ws);

    // Clean up empty sets
    if (heatConnections.size === 0) {
      connections.delete(heatId);
    }
  }
}

export function setSubscriptions(
  heatId: string,
  ws: ServerWebSocket<{ heatId?: string }>,
  subscriptionPrefs: ClientSubscription
): void {
  const heatConnections = connections.get(heatId);
  if (heatConnections?.has(ws)) {
    subscriptions.set(ws, subscriptionPrefs);
  }
}

export function getSubscriptions(
  heatId: string,
  ws: ServerWebSocket<{ heatId?: string }>
): ClientSubscription | undefined {
  const heatConnections = connections.get(heatId);
  if (heatConnections?.has(ws)) {
    return subscriptions.get(ws);
  }
  return undefined;
}

function isWebSocketOpen(ws: ServerWebSocket<{ heatId?: string }>): boolean {
  const state = ws.readyState;
  if (typeof state === "string") {
    return state === "open";
  }
  if (typeof state === "number") {
    // 1 is the standard numeric value for WebSocket.OPEN
    return state === 1;
  }
  return false;
}

/**
 * Broadcasts heat state update to all connected clients.
 * Reads current state from the database.
 */
export async function broadcastHeatUpdate(heatId: string): Promise<void> {
  const heatConnections = connections.get(heatId);
  if (!heatConnections || heatConnections.size === 0) {
    return;
  }

  // Check if any client is subscribed to state updates
  const hasStateSubscribers = Array.from(heatConnections).some(
    (ws) => isWebSocketOpen(ws) && subscriptions.get(ws)?.state
  );

  if (hasStateSubscribers) {
    const db = await getDb();
    const heatRepository = createHeatRepository(db);
    const scoreRepository = createScoreRepository(db);
    const riderRepository = createRiderRepository(db);

    const heat = await heatRepository.getHeatByHeatId(heatId);
    if (!heat) {
      return;
    }

    const dbScores = await scoreRepository.getScoresByHeatId(heatId);

    // Build HeatState compatible structure for buildHeatViewerState
    const heatState = {
      heatId: heat.heatId,
      riderIds: heat.riderIds,
      heatRules: {
        wavesCounting: heat.wavesCounting,
        jumpsCounting: heat.jumpsCounting,
      },
      scores: dbScores.map((s) => {
        if (s.type === "wave") {
          return {
            type: "wave" as const,
            scoreUUID: s.scoreUuid,
            riderId: s.riderId,
            judgeId: s.judgeId,
            score: s.scoreValue,
            timestamp: s.timestamp,
          };
        } else {
          return {
            type: "jump" as const,
            scoreUUID: s.scoreUuid,
            riderId: s.riderId,
            judgeId: s.judgeId,
            score: s.scoreValue,
            jumpType: s.jumpType as JumpType,
            modifiers: s.jumpModifiers as JumpModifier[],
            timestamp: s.timestamp,
          };
        }
      }),
      bracketId: heat.bracketId,
      position: heat.position,
      completedAt: heat.completedAt,
    };

    const viewerState = await buildHeatViewerState(heatState, riderRepository);
    const stateMessage: WebSocketServerMessage = {
      type: "state",
      state: viewerState,
    };
    const stateMessageJson = JSON.stringify(stateMessage);

    for (const ws of heatConnections) {
      const subs = subscriptions.get(ws);
      if (isWebSocketOpen(ws) && subs?.state) {
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
