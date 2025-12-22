// Script to reset the persistence layer by truncating event store tables

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

async function resetDatabase() {
  const client = new Client({ connectionString });

  try {
    console.log("Connecting to database...");
    await client.connect();
    console.log("Connected successfully.");

    // Find event store tables
    console.log("\nDiscovering event store tables...");
    const tables = await findEventStoreTables(client);

    if (tables.length === 0) {
      console.log(
        "No event store tables found. Database may already be empty or schema not initialized."
      );
      console.log("Tip: Start the application once to initialize the schema.");
      return;
    }

    console.log(`Found ${tables.length} table(s): ${tables.join(", ")}`);

    // Disable foreign key checks (if any) and truncate tables
    console.log("\nTruncating tables...");
    await client.query("BEGIN");

    try {
      // Truncate all tables in reverse dependency order (child tables first if any)
      // For most event stores, we can truncate in any order, but let's be safe
      for (const table of tables.reverse()) {
        console.log(`  Truncating ${table}...`);
        await client.query(`TRUNCATE TABLE "${table}" CASCADE`);
      }

      await client.query("COMMIT");
      console.log("\n✓ Successfully reset persistence layer.");
      console.log(`  Truncated ${tables.length} table(s).`);
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
