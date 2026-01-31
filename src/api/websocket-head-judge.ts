import type { ServerWebSocket } from "bun";
import {
  calculateJumpTotal,
  calculateWaveTotal,
  getCountingJumpScores,
  getCountingWaveScores,
} from "../domain/heat/index.js";
import type { JumpModifier, JumpType, Score } from "../domain/heat/types.js";
import { getDb } from "../infrastructure/db/index.js";
import {
  createHeatRepository,
  createRiderRepository,
  createScoreRepository,
  createUserRepository,
} from "../infrastructure/repositories/index.js";
import type { HeadJudgeState, HeadJudgeWebSocketServerMessage } from "./types.js";

type WebSocketConnection = ServerWebSocket<{ heatId?: string; userId?: string; userRole?: string }>;

// Connection map: heatId -> Set of WebSocket connections
const connections = new Map<string, Set<WebSocketConnection>>();

// Subscriptions map
interface ClientSubscription {
  state: boolean;
}
const subscriptions = new Map<WebSocketConnection, ClientSubscription>();

// Heartbeat interval
const HEARTBEAT_INTERVAL = 30000;

export function addHeadJudgeConnection(heatId: string, ws: WebSocketConnection): void {
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
        // Connection closed
      }
    } else {
      clearInterval(heartbeatInterval);
    }
  }, HEARTBEAT_INTERVAL);

  (ws as unknown as { _heartbeatInterval?: ReturnType<typeof setInterval> })._heartbeatInterval =
    heartbeatInterval;
}

export function removeHeadJudgeConnection(heatId: string, ws: WebSocketConnection): void {
  const heatConnections = connections.get(heatId);
  if (heatConnections) {
    heatConnections.delete(ws);

    // Clean up heartbeat
    const intervalId = (ws as unknown as { _heartbeatInterval?: ReturnType<typeof setInterval> })
      ._heartbeatInterval;
    if (intervalId) {
      clearInterval(intervalId);
    }

    subscriptions.delete(ws);

    if (heatConnections.size === 0) {
      connections.delete(heatId);
    }
  }
}

export function setHeadJudgeSubscriptions(
  heatId: string,
  ws: WebSocketConnection,
  subscriptionPrefs: ClientSubscription
): void {
  const heatConnections = connections.get(heatId);
  if (heatConnections?.has(ws)) {
    subscriptions.set(ws, subscriptionPrefs);
  }
}

function isWebSocketOpen(ws: WebSocketConnection): boolean {
  const state = ws.readyState;
  if (typeof state === "string") {
    return state === "open";
  }
  if (typeof state === "number") {
    return state === 1;
  }
  return false;
}

export async function broadcastHeadJudgeUpdate(heatId: string): Promise<void> {
  const heatConnections = connections.get(heatId);
  if (!heatConnections || heatConnections.size === 0) {
    return;
  }

  // Check if any client is subscribed
  const hasSubscribers = Array.from(heatConnections).some(
    (ws) => isWebSocketOpen(ws) && subscriptions.get(ws)?.state
  );

  if (!hasSubscribers) {
    return;
  }

  // Build heat state
  const db = await getDb();
  const heatRepository = createHeatRepository(db);
  const scoreRepository = createScoreRepository(db);
  const riderRepository = createRiderRepository(db);
  const userRepository = createUserRepository(db);

  const heat = await heatRepository.getHeatByHeatId(heatId);
  if (!heat) {
    return;
  }

  const dbScores = await scoreRepository.getScoresByHeatId(heatId);

  const domainScores: Score[] = dbScores.map((s) => {
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
  });

  const judgeIds = Array.from(new Set(domainScores.map((s) => s.judgeId)));

  const judges = await Promise.all(
    judgeIds.map(async (judgeId) => {
      const user = await userRepository.getUserById(judgeId);
      const judgeScores = domainScores.filter((s) => s.judgeId === judgeId);

      const countingWaveScores = new Set<string>();
      const countingJumpScores = new Set<string>();

      for (const riderId of heat.riderIds) {
        const waveCounting = getCountingWaveScores(
          riderId,
          judgeId,
          domainScores,
          heat.wavesCounting
        );
        const jumpCounting = getCountingJumpScores(
          riderId,
          judgeId,
          domainScores,
          heat.jumpsCounting
        );

        waveCounting.forEach((uuid) => {
          countingWaveScores.add(uuid);
        });
        jumpCounting.forEach((uuid) => {
          countingJumpScores.add(uuid);
        });
      }

      const riderTotals: Record<string, number> = {};
      for (const riderId of heat.riderIds) {
        const waveTotal = calculateWaveTotal(riderId, judgeId, domainScores, heat.wavesCounting);
        const jumpTotal = calculateJumpTotal(riderId, judgeId, domainScores, heat.jumpsCounting);
        riderTotals[riderId] = waveTotal + jumpTotal;
      }

      return {
        judgeId,
        judgeName: user?.username || user?.email || "Unknown",
        scores: judgeScores.map((s) => ({
          scoreUUID: s.scoreUUID,
          riderId: s.riderId,
          type: s.type,
          scoreValue: s.score,
          jumpType: s.type === "jump" ? s.jumpType : null,
          modifiers: s.type === "jump" ? s.modifiers : null,
          timestamp: s.timestamp,
          isCounting:
            s.type === "wave"
              ? countingWaveScores.has(s.scoreUUID)
              : countingJumpScores.has(s.scoreUUID),
        })),
        riderTotals,
      };
    })
  );

  const riders = await Promise.all(
    heat.riderIds.map(async (riderId) => {
      const rider = await riderRepository.getRiderById(riderId);
      return {
        riderId,
        firstName: rider?.firstName || "Unknown",
        lastName: rider?.lastName || "",
        sailNumber: rider?.sailNumber || "N/A",
        country: rider?.country || "Unknown",
      };
    })
  );

  // Calculate averaged totals across all judges for each rider
  const averagedTotals: Record<string, number> = {};
  for (const riderId of heat.riderIds) {
    if (judges.length > 0) {
      const totalSum = judges.reduce((sum, judge) => {
        return sum + (judge.riderTotals[riderId] || 0);
      }, 0);
      averagedTotals[riderId] = totalSum / judges.length;
    } else {
      averagedTotals[riderId] = 0;
    }
  }

  const state: HeadJudgeState = {
    heatId: heat.heatId,
    heatRules: {
      wavesCounting: heat.wavesCounting,
      jumpsCounting: heat.jumpsCounting,
    },
    riders,
    judges,
    averagedTotals,
    bracketId: heat.bracketId,
    position: heat.position,
    roundNumber: heat.roundNumber,
    roundName: heat.roundName,
    completedAt: heat.completedAt,
  };

  const message: HeadJudgeWebSocketServerMessage = {
    type: "head_judge_state",
    state,
  };

  const messageJson = JSON.stringify(message);

  for (const ws of heatConnections) {
    const subs = subscriptions.get(ws);
    if (isWebSocketOpen(ws) && subs?.state) {
      try {
        ws.send(messageJson);
      } catch (_error) {
        removeHeadJudgeConnection(heatId, ws);
      }
    }
  }
}

export function handleHeadJudgeWebSocketMessage(
  heatId: string,
  ws: WebSocketConnection,
  message: string
): void {
  try {
    const parsed = JSON.parse(message);

    switch (parsed.type) {
      case "subscribe": {
        const subscriptions: ClientSubscription = {
          state: parsed.subscriptions.includes("state"),
        };
        setHeadJudgeSubscriptions(heatId, ws, subscriptions);
        break;
      }
      case "pong": {
        // Heartbeat response
        break;
      }
      default: {
        // Unknown message
        break;
      }
    }
  } catch (_error) {
    // Invalid JSON
  }
}
