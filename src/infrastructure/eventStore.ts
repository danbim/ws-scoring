import { getInMemoryEventStore } from "@event-driven-io/emmett";
import { getPostgreSQLEventStore } from "@event-driven-io/emmett-postgresql";

// Create an event store for the heat aggregate
// By default, uses PostgreSQL event store (production)
// Set USE_IN_MEMORY_EVENT_STORE=true to use in-memory store (for testing)
// The connection string should be provided via POSTGRESQL_CONNECTION_STRING environment variable
// Format: postgresql://user:password@host:port/database

let _eventStore:
  | ReturnType<typeof getInMemoryEventStore>
  | ReturnType<typeof getPostgreSQLEventStore>
  | null = null;

function getEventStore() {
  if (_eventStore === null) {
    const useInMemoryStore = process.env.USE_IN_MEMORY_EVENT_STORE === "true";
    const connectionString =
      process.env.POSTGRESQL_CONNECTION_STRING ??
      `postgresql://${process.env.POSTGRES_USER}:${process.env.POSTGRES_PASSWORD}@${process.env.POSTGRES_HOST}:${process.env.POSTGRES_PORT}/${process.env.POSTGRES_DB}`;
    _eventStore = useInMemoryStore
      ? getInMemoryEventStore()
      : getPostgreSQLEventStore(connectionString);
  }
  return _eventStore;
}

export const eventStore = new Proxy({} as ReturnType<typeof getInMemoryEventStore>, {
  get(_target, prop) {
    return getEventStore()[prop as keyof typeof _eventStore];
  },
});
