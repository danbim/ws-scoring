// Script to reset the persistence layer by truncating event store tables and drizzle relational tables

import { Client } from "pg";

const connectionString =
  process.env.POSTGRESQL_CONNECTION_STRING ??
  `postgresql://${process.env.POSTGRES_USER}:${process.env.POSTGRES_PASSWORD}@${process.env.POSTGRES_HOST}:${process.env.POSTGRES_PORT}/${process.env.POSTGRES_DB}`;

async function findEventStoreTables(client: Client): Promise<string[]> {
  // Query to find tables that are likely part of Emmett's event store
  // Emmett typically uses tables like 'events', 'streams', or prefixed with 'emmett_'
  const query = `
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN ('emt_messages', 'emt_streams', 'emt_subscriptions')
    ORDER BY table_name;
  `;

  const result = await client.query(query);
  return result.rows.map((row) => row.table_name);
}

async function findDrizzleTables(client: Client): Promise<string[]> {
  // Query to find drizzle-managed relational tables
  const query = `
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN (
        'seasons',
        'contests',
        'divisions',
        'brackets',
        'division_participants',
        'heats',
        'riders'
      )
    ORDER BY table_name;
  `;

  const result = await client.query(query);
  return result.rows.map((row) => row.table_name);
}

async function resetDatabase() {
  const client = new Client({ connectionString });

  try {
    console.log("Connecting to database...");
    await client.connect();
    console.log("Connected successfully.");

    // Find event store tables
    console.log("\nDiscovering event store tables...");
    const eventStoreTables = await findEventStoreTables(client);

    // Find drizzle relational tables
    console.log("\nDiscovering drizzle relational tables...");
    const drizzleTables = await findDrizzleTables(client);

    const allTables = [...eventStoreTables, ...drizzleTables];

    if (allTables.length === 0) {
      console.log("No tables found. Database may already be empty or schema not initialized.");
      console.log("Tip: Start the application once to initialize the schema.");
      return;
    }

    console.log(
      `Found ${eventStoreTables.length} event store table(s): ${eventStoreTables.join(", ") || "none"}`
    );
    console.log(
      `Found ${drizzleTables.length} drizzle table(s): ${drizzleTables.join(", ") || "none"}`
    );

    // Define truncation order for drizzle tables (child tables first, respecting foreign key constraints)
    // This order ensures we truncate in reverse dependency order
    const drizzleTruncationOrder = [
      "heats", // depends on brackets
      "division_participants", // depends on divisions and riders
      "brackets", // depends on divisions
      "divisions", // depends on contests
      "contests", // depends on seasons
      "seasons", // no dependencies
      "riders", // no dependencies (but division_participants depends on it)
    ];

    // Filter to only include tables that exist
    const orderedDrizzleTables = drizzleTruncationOrder.filter((table) =>
      drizzleTables.includes(table)
    );

    // Disable foreign key checks (if any) and truncate tables
    console.log("\nTruncating tables...");
    await client.query("BEGIN");

    try {
      // Truncate drizzle tables in dependency order
      for (const table of orderedDrizzleTables) {
        console.log(`  Truncating ${table}...`);
        await client.query(`TRUNCATE TABLE "${table}" CASCADE`);
      }

      // Truncate event store tables (order doesn't matter much, but reverse for consistency)
      for (const table of eventStoreTables.reverse()) {
        console.log(`  Truncating ${table}...`);
        await client.query(`TRUNCATE TABLE "${table}" CASCADE`);
      }

      await client.query("COMMIT");
      console.log("\n✓ Successfully reset persistence layer.");
      console.log(`  Truncated ${allTables.length} table(s) total.`);
      console.log(`    - ${drizzleTables.length} drizzle table(s)`);
      console.log(`    - ${eventStoreTables.length} event store table(s)`);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  } catch (error) {
    console.error("\n✗ Error resetting database:", error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run if executed directly
if (import.meta.main) {
  resetDatabase().catch((error) => {
    console.error("Unexpected error:", error);
    process.exit(1);
  });
}
