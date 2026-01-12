// API request/response types
import type { HeatViewerState, RiderViewerData } from "../domain/heat/index.js";

// Request types are now defined in schemas.ts using Zod
export type {
  AddJumpScoreRequest,
  AddWaveScoreRequest,
  CreateHeatRequest,
} from "./schemas.js";

// Viewer state types - re-exported from domain for convenience
export type { HeatViewerState, RiderViewerData };

// Head Judge API types
export interface HeadJudgeRiderInfo {
  riderId: string;
  firstName: string;
  lastName: string;
  sailNumber: string;
  country: string;
}

export interface HeadJudgeScoreSheet {
  judgeId: string;
  judgeName: string;
  scores: Array<{
    scoreUUID: string;
    riderId: string;
    type: "wave" | "jump";
    scoreValue: number;
    jumpType: string | null;
    modifiers: string[] | null;
    timestamp: Date;
    isCounting: boolean;
  }>;
  riderTotals: Record<string, number>;
}

export interface HeadJudgeState {
  heatId: string;
  heatRules: {
    wavesCounting: number;
    jumpsCounting: number;
  };
  riders: HeadJudgeRiderInfo[];
  judges: HeadJudgeScoreSheet[];
  averagedTotals: Record<string, number>;
  bracketId: string;
  position: string;
  roundNumber: number;
  roundName: string;
  completedAt: Date | null;
}

// WebSocket message types
export interface WebSocketSubscribeMessage {
  type: "subscribe";
  subscriptions: Array<"events" | "state">;
}

export interface WebSocketPongMessage {
  type: "pong";
}

export type WebSocketClientMessage = WebSocketSubscribeMessage | WebSocketPongMessage;

export interface WebSocketEventMessage {
  type: "event";
  event: {
    type: string;
    data: unknown;
  };
}

export interface WebSocketStateMessage {
  type: "state";
  state: HeatViewerState;
}

export interface WebSocketPingMessage {
  type: "ping";
}

export type WebSocketServerMessage =
  | WebSocketEventMessage
  | WebSocketStateMessage
  | WebSocketPingMessage;

// Client subscription preferences
export interface ClientSubscription {
  events: boolean;
  state: boolean;
}

// Head Judge WebSocket message types
export type HeadJudgeWebSocketServerMessage =
  | { type: "head_judge_state"; state: HeadJudgeState }
  | { type: "ping" };

export type HeadJudgeWebSocketClientMessage =
  | { type: "subscribe"; subscriptions: string[] }
  | { type: "pong" };
