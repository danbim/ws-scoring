// Helper functions for API

import { decide, evolve, type HeatCommand, initialState } from "../domain/heat/index.js";
import type { HeatEvent, HeatState } from "../domain/heat/types.js";
import { eventStore } from "../infrastructure/eventStore.js";

export function getStreamName(heatId: string): string {
  return `heat-${heatId}`;
}

export async function aggregateHeatState(heatId: string): Promise<HeatState | null> {
  const result = await eventStore.aggregateStream(getStreamName(heatId), {
    evolve,
    initialState,
  });
  return result.state;
}

export async function handleCommand(command: HeatCommand): Promise<HeatEvent[]> {
  const heatId = command.data.heatId;
  const currentState = await aggregateHeatState(heatId);
  const events = decide(command, currentState);
  await eventStore.appendToStream(getStreamName(heatId), events);
  return events;
}

export function createErrorResponse(message: string, status: number = 400): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export function createSuccessResponse(data: unknown, status: number = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
