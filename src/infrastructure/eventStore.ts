import { getInMemoryEventStore } from "@event-driven-io/emmett";

// Create an in-memory event store for the heat aggregate
export const eventStore = getInMemoryEventStore();
