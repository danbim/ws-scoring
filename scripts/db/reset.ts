// Script to reset the database by truncating all application tables

import { Client } from "pg";

const connectionString = `postgresql://${process.env.POSTGRES_USER}:${process.env.POSTGRES_PASSWORD}@${process.env.POSTGRES_HOST ?? "localhost"}:${process.env.POSTGRES_PORT ?? "5432"}/${process.env.POSTGRES_DB}`;

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

    console.log("\nDiscovering application tables...");
    const appTables = await findDrizzleTables(client);

    if (appTables.length === 0) {
      console.log("No tables found. Database may already be empty or schema not initialized.");
      console.log("Tip: Run migrations with 'bun run db:migrate' to initialize the schema.");
      return;
    }

    console.log(`Found ${appTables.length} application table(s): ${appTables.join(", ")}`);

    // Define truncation order for application tables (child tables first, respecting foreign key constraints)
    // This order ensures we truncate in reverse dependency order
    const appTruncationOrder = [
      "heats", // depends on brackets
      "division_participants", // depends on divisions and riders
      "brackets", // depends on divisions
      "divisions", // depends on contests
      "contests", // depends on seasons
      "seasons", // no dependencies
      "riders", // no dependencies (but division_participants depends on it)
    ];

    // Filter to only include tables that exist
    const orderedAppTables = appTruncationOrder.filter((table) => appTables.includes(table));

    // Truncate tables
    console.log("\nTruncating tables...");
    await client.query("BEGIN");

    try {
      for (const table of orderedAppTables) {
        console.log(`  Truncating ${table}...`);
        await client.query(`TRUNCATE TABLE "${table}" CASCADE`);
      }

      await client.query("COMMIT");
      console.log(`\n✓ Successfully reset database. Truncated ${appTables.length} table(s).`);
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
