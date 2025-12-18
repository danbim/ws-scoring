import { getInMemoryEventStore } from "@event-driven-io/emmett";
import type { HeatEvent } from "../domain/heat/types.js";

// Create an in-memory event store for the heat aggregate
export const eventStore = getInMemoryEventStore<HeatEvent>();
