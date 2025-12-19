// API request/response types
import type { HeatState } from "../domain/heat/types.js";

// Request types are now defined in schemas.ts using Zod
export type {
  AddJumpScoreRequest,
  AddWaveScoreRequest,
  CreateHeatRequest,
} from "./schemas.js";

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
  state: HeatState;
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
