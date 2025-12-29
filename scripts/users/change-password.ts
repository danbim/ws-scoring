// Interactive script to change a user's password

import { eq } from "drizzle-orm";
import { hashPassword, validatePassword } from "../../src/domain/user/user-service.js";
import { connectDb, disconnectDb } from "../../src/infrastructure/db/index.js";
import { users } from "../../src/infrastructure/db/schema.js";
import { prompt } from "../prompt.js";

async function main() {
  console.log("Change user password\n");

  const username = await prompt("Username");
  const newPassword = await prompt("New password");

  if (!validatePassword(newPassword)) {
    console.error("\nError: Password must be at least 8 characters");
    process.exit(1);
  }

  try {
    const db = await connectDb();

    const [user] = await db.select().from(users).where(eq(users.username, username)).limit(1);

    if (!user) {
      console.error(`\nError: User with username "${username}" not found`);
      await disconnectDb();
      process.exit(1);
    }

    const passwordHash = await hashPassword(newPassword);

    const [updatedUser] = await db
      .update(users)
      .set({
        passwordHash,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id))
      .returning();

    console.log("\nPassword changed successfully!");
    console.log(
      JSON.stringify(
        {
          id: updatedUser.id,
          username: updatedUser.username,
        },
        null,
        2
      )
    );

    await disconnectDb();
  } catch (error) {
    console.error("\nFailed to change password:", error);
    await disconnectDb();
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Unexpected error:", error);
  process.exit(1);
});
