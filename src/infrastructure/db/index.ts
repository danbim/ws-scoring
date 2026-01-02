import { drizzle } from "drizzle-orm/node-postgres";
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

export { schema };
