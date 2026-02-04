import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import type { PgliteDatabase } from "drizzle-orm/pglite";
import { Pool } from "pg";
import * as schema from "./schema.js";

const getPostgresConnectionString = () =>
  `postgresql://${process.env.POSTGRES_USER}:${process.env.POSTGRES_PASSWORD}@${process.env.POSTGRES_HOST}:${process.env.POSTGRES_PORT}/${process.env.POSTGRES_DB}`;

const pool = new Pool({ connectionString: getPostgresConnectionString() });
const db = drizzle(pool, { schema });

// Test database override (only used in tests)
let testDb: PgliteDatabase<typeof schema> | null = null;

export async function getDb() {
  if (testDb) {
    return testDb;
  }
  return db;
}

/**
 * Override the database instance for testing.
 * ONLY use this in test setup code.
 */
export function setDbForTesting(db: PgliteDatabase<typeof schema>): void {
  testDb = db;
}

/**
 * Clear the test database override.
 * ONLY use this in test teardown code.
 */
export function clearTestDb(): void {
  testDb = null;
}

// Type for transaction context - supports both NodePg and PGlite transactions
// This allows repositories to accept transaction objects from either database type
export type DbTransaction =
  | Parameters<Parameters<NodePgDatabase<typeof schema>["transaction"]>[0]>[0]
  | Parameters<Parameters<PgliteDatabase<typeof schema>["transaction"]>[0]>[0];
export type DbType = NodePgDatabase<typeof schema> | PgliteDatabase<typeof schema>;
export type DbConnection = DbType | DbTransaction;

export { schema };
