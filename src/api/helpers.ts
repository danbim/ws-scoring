// Helper functions for API
import { eventStore } from "../infrastructure/eventStore.js";
import {
  initialState,
  evolve,
  decide,
  type HeatCommand,
} from "../domain/heat/index.js";
import type { HeatEvent, HeatState } from "../domain/heat/types.js";

export function getStreamName(heatId: string): string {
  return `heat-${heatId}`;
}

export async function aggregateHeatState(
  heatId: string
): Promise<HeatState | null> {
  const result = await eventStore.aggregateStream(getStreamName(heatId), {
    evolve,
    initialState,
  });
  return result.state;
}

export async function handleCommand(
  command: HeatCommand
): Promise<{ events: HeatEvent[]; heatId: string }> {
  const heatId =
    command.type === "CreateHeat" ? command.data.heatId : command.data.heatId;

  // Get current state
  const currentState = await aggregateHeatState(heatId);

  // Decide on command
  const events = decide(command, currentState);

  // Append events to stream
  await eventStore.appendToStream(getStreamName(heatId), events);

  return { events, heatId };
}

export function createErrorResponse(
  message: string,
  status: number = 400
): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export function createSuccessResponse(
  data: unknown,
  status: number = 200
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
