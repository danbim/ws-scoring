import { PGlite } from "@electric-sql/pglite";
import type { PgliteDatabase } from "drizzle-orm/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import * as schema from "../src/infrastructure/db/schema.js";

export type TestDbType = PgliteDatabase<typeof schema>;

let testDbInstance: TestDbType | null = null;
let testPgliteClient: PGlite | null = null;

/**
 * Creates a new in-memory PGlite database for testing.
 * Runs all migrations to setup schema.
 */
export async function createTestDb(): Promise<TestDbType> {
  // Create in-memory PGlite instance
  testPgliteClient = new PGlite();

  // Create Drizzle instance with schema
  const db = drizzle(testPgliteClient, { schema });

  // Run migrations to setup schema
  await migrate(db, { migrationsFolder: "./drizzle" });

  return db;
}

/**
 * Setup test database for a test file.
 * Call this in beforeAll().
 */
export async function setupTestDb(): Promise<TestDbType> {
  const { setDbForTesting } = await import("../src/infrastructure/db/index.js");

  testDbInstance = await createTestDb();
  setDbForTesting(testDbInstance);

  return testDbInstance;
}

/**
 * Clear all data from test database.
 * Call this in beforeEach() to ensure test isolation.
 */
export async function clearTestData(): Promise<void> {
  if (!testDbInstance) {
    return;
  }

  // Delete all data in reverse dependency order to respect foreign keys
  await testDbInstance.delete(schema.scores);
  await testDbInstance.delete(schema.heats);
  await testDbInstance.delete(schema.divisionParticipants);
  await testDbInstance.delete(schema.brackets);
  await testDbInstance.delete(schema.divisions);
  await testDbInstance.delete(schema.contests);
  await testDbInstance.delete(schema.seasons);
  await testDbInstance.delete(schema.riders);
  await testDbInstance.delete(schema.users);
  await testDbInstance.delete(schema.sessions);
}

/**
 * Get the test database instance.
 * Call this after setupTestDb() has been called.
 */
export function getTestDb(): TestDbType {
  if (!testDbInstance) {
    throw new Error("Test database not initialized. Call setupTestDb() first.");
  }
  return testDbInstance;
}

/**
 * Teardown test database for a test file.
 * Call this in afterAll().
 */
export async function teardownTestDb(): Promise<void> {
  if (testPgliteClient) {
    // PGlite cleanup - close the database
    await testPgliteClient.close();
    testPgliteClient = null;
  }

  if (testDbInstance) {
    testDbInstance = null;
  }

  const { clearTestDb } = await import("../src/infrastructure/db/index.js");
  clearTestDb();
}
