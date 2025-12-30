import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import * as schema from "./schema.js";

const getPostgresConnectionString = () =>
  process.env.POSTGRESQL_CONNECTION_STRING ??
  `postgresql://${process.env.POSTGRES_USER}:${process.env.POSTGRES_PASSWORD}@${process.env.POSTGRES_HOST}:${process.env.POSTGRES_PORT}/${process.env.POSTGRES_DB}`;

let client: Client | null = null;
let db: ReturnType<typeof drizzle> | null = null;
let isConnected = false;
let connectionPromise: Promise<ReturnType<typeof drizzle>> | null = null;

export async function getDb(): Promise<ReturnType<typeof drizzle>> {
  // If already connected, return immediately
  if (db && isConnected) {
    return db;
  }

  // If connection is in progress, wait for it
  if (connectionPromise) {
    return connectionPromise;
  }

  // Start new connection
  connectionPromise = (async () => {
    try {
      if (!db) {
        const connectionString = getPostgresConnectionString();
        client = new Client({ connectionString });
        await client.connect();
        isConnected = true;
        db = drizzle(client, { schema });
      } else if (!isConnected) {
        await client?.connect();
        isConnected = true;
      }
      return db;
    } finally {
      // Clear the promise once connection is established or fails
      connectionPromise = null;
    }
  })();

  return connectionPromise;
}

export async function connectDb() {
  return getDb();
}

export async function disconnectDb() {
  if (client) {
    await client.end();
    client = null;
    db = null;
    isConnected = false;
  }
}

export { schema };
