import type { EventStore } from "@event-driven-io/emmett";
import { getInMemoryEventStore } from "@event-driven-io/emmett";
import { getPostgreSQLEventStore } from "@event-driven-io/emmett-postgresql";

// Create an event store for the heat aggregate
// By default, uses PostgreSQL event store (production)
// Set USE_IN_MEMORY_EVENT_STORE=true to use in-memory store (for testing)
//
// The connection string should be provided via POSTGRESQL_CONNECTION_STRING environment variable
// Format: postgresql://user:password@host:port/database
//
// Alternatively, the connection string is constructed from the POSTGRES_USER, POSTGRES_PASSWORD,
// POSTGRES_HOST, POSTGRES_PORT, and POSTGRES_DB environment variables.

const getPostgresConnectionString = () =>
  process.env.POSTGRESQL_CONNECTION_STRING ??
  `postgresql://${process.env.POSTGRES_USER}:${process.env.POSTGRES_PASSWORD}@${process.env.POSTGRES_HOST}:${process.env.POSTGRES_PORT}/${process.env.POSTGRES_DB}`;

const useInMemoryStore = process.env.USE_IN_MEMORY_EVENT_STORE === "true";

export const eventStore: EventStore = useInMemoryStore
  ? getInMemoryEventStore()
  : getPostgreSQLEventStore(getPostgresConnectionString());
