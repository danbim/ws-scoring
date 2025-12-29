// Interactive script to delete a user

import { eq } from "drizzle-orm";
import { connectDb, disconnectDb } from "../../src/infrastructure/db/index.js";
import { users } from "../../src/infrastructure/db/schema.js";
import { prompt } from "../prompt.js";

async function main() {
  console.log("Delete a user\n");

  const username = await prompt("Username to delete");

  try {
    const db = await connectDb();

    const [user] = await db.select().from(users).where(eq(users.username, username)).limit(1);

    if (!user) {
      console.error(`\nError: User with username "${username}" not found`);
      await disconnectDb();
      process.exit(1);
    }

    console.log(`\nUser to delete:`);
    console.log(
      JSON.stringify(
        {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
        },
        null,
        2
      )
    );

    const confirm = await prompt("\nAre you sure you want to delete this user? (yes/no)", "no");

    if (confirm.toLowerCase() !== "yes") {
      console.log("Deletion cancelled.");
      await disconnectDb();
      return;
    }

    await db.delete(users).where(eq(users.id, user.id));

    console.log("\nUser deleted successfully!");

    await disconnectDb();
  } catch (error) {
    console.error("\nFailed to delete user:", error);
    await disconnectDb();
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Unexpected error:", error);
  process.exit(1);
});
