// Script to list all users

import { connectDb, disconnectDb } from "../../src/infrastructure/db/index.js";
import { users } from "../../src/infrastructure/db/schema.js";

async function main() {
  try {
    const db = await connectDb();

    const allUsers = await db.select().from(users);

    console.log(`\nFound ${allUsers.length} user(s):\n`);

    if (allUsers.length === 0) {
      console.log("No users found.");
    } else {
      for (const user of allUsers) {
        console.log(
          JSON.stringify(
            {
              id: user.id,
              username: user.username,
              email: user.email,
              role: user.role,
              createdAt: user.createdAt,
            },
            null,
            2
          )
        );
        console.log("");
      }
    }

    await disconnectDb();
  } catch (error) {
    console.error("\nFailed to list users:", error);
    await disconnectDb();
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Unexpected error:", error);
  process.exit(1);
});
