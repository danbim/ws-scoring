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
