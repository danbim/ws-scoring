// Interactive script to update a user

import { eq } from "drizzle-orm";
import type { UserRole } from "../../src/domain/user/types.js";
import { connectDb, disconnectDb } from "../../src/infrastructure/db/index.js";
import { users } from "../../src/infrastructure/db/schema.js";
import { prompt } from "../prompt.js";

async function main() {
  console.log("Update a user\n");

  const username = await prompt("Username to update");

  try {
    const db = await connectDb();

    const [user] = await db.select().from(users).where(eq(users.username, username)).limit(1);

    if (!user) {
      console.error(`\nError: User with username "${username}" not found`);
      await disconnectDb();
      process.exit(1);
    }

    console.log(`\nCurrent user data:`);
    console.log(
      JSON.stringify(
        {
          username: user.username,
          email: user.email,
          role: user.role,
        },
        null,
        2
      )
    );
    console.log("");

    const newUsername = await prompt("New username (leave empty to keep current)", user.username);
    const newEmail = await prompt(
      "New email (leave empty to keep current, 'null' to remove)",
      user.email || ""
    );
    const newRoleInput = await prompt(
      "New role (judge, head_judge, administrator, leave empty to keep current)",
      user.role
    );

    const updates: {
      username?: string;
      email?: string | null;
      role?: UserRole;
      updatedAt?: Date;
    } = {
      updatedAt: new Date(),
    };

    if (newUsername !== user.username) {
      // Check if new username already exists
      const existing = await db
        .select()
        .from(users)
        .where(eq(users.username, newUsername))
        .limit(1);

      if (existing.length > 0) {
        console.error("\nError: Username already exists");
        await disconnectDb();
        process.exit(1);
      }
      updates.username = newUsername;
    }

    if (newEmail !== user.email) {
      if (newEmail === "null" || newEmail === "") {
        updates.email = null;
      } else {
        updates.email = newEmail;
      }
    }

    if (newRoleInput !== user.role) {
      if (
        newRoleInput === "judge" ||
        newRoleInput === "head_judge" ||
        newRoleInput === "administrator"
      ) {
        updates.role = newRoleInput;
      } else {
        console.error("\nError: Invalid role. Must be one of: judge, head_judge, administrator");
        await disconnectDb();
        process.exit(1);
      }
    }

    const [updatedUser] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, user.id))
      .returning();

    console.log("\nUser updated successfully!");
    console.log(
      JSON.stringify(
        {
          id: updatedUser.id,
          username: updatedUser.username,
          email: updatedUser.email,
          role: updatedUser.role,
        },
        null,
        2
      )
    );

    await disconnectDb();
  } catch (error) {
    console.error("\nFailed to update user:", error);
    await disconnectDb();
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Unexpected error:", error);
  process.exit(1);
});
