// API request/response types

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

// Viewer state types - pre-computed data for display
export interface RiderViewerData {
  riderId: string;
  position: number; // 1-based rank
  country: string;
  sailNumber: string;
  lastName: string;
  waveTotal: number;
  jumpTotal: number;
  total: number;
}

export interface HeatViewerState {
  heatId: string;
  riders: RiderViewerData[]; // Sorted by total score (descending)
}
