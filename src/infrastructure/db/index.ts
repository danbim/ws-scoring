import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import * as schema from "./schema.js";

const getPostgresConnectionString = () =>
  process.env.POSTGRESQL_CONNECTION_STRING ??
  `postgresql://${process.env.POSTGRES_USER}:${process.env.POSTGRES_PASSWORD}@${process.env.POSTGRES_HOST}:${process.env.POSTGRES_PORT}/${process.env.POSTGRES_DB}`;

let client: Client | null = null;
let db: ReturnType<typeof drizzle> | null = null;
let isConnected = false;

export async function getDb(): Promise<ReturnType<typeof drizzle>> {
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
