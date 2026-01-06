import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema.js";

const getPostgresConnectionString = () =>
  process.env.POSTGRESQL_CONNECTION_STRING ??
  `postgresql://${process.env.POSTGRES_USER}:${process.env.POSTGRES_PASSWORD}@${process.env.POSTGRES_HOST}:${process.env.POSTGRES_PORT}/${process.env.POSTGRES_DB}`;

const pool = new Pool({ connectionString: getPostgresConnectionString() });
const db = drizzle(pool, { schema });

export async function getDb() {
  return db;
}

// Type for transaction context - extracts the transaction type from Drizzle's db.transaction callback
// This allows repositories to accept the same transaction object for use within a transaction block
export type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
export type DbType = NodePgDatabase<typeof schema>;

export { schema };
