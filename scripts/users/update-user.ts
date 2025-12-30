// Interactive script to update a user

import type { UserRole } from "../../src/domain/user/types.js";
import { createUserRepository } from "../../src/infrastructure/repositories/index.js";
import { prompt } from "../prompt.js";

async function main() {
  console.log("Update a user\n");

  const username = await prompt("Username to update");

  try {
    const userRepository = createUserRepository();

    const user = await userRepository.getUserByUsername(username);

    if (!user) {
      console.error(`\nError: User with username "${username}" not found`);
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
    } = {};

    if (newUsername !== user.username) {
      // Check if new username already exists
      const existing = await userRepository.getUserByUsername(newUsername);

      if (existing) {
        console.error("\nError: Username already exists");
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
        process.exit(1);
      }
    }

    const updatedUser = await userRepository.updateUser(user.id, updates);

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
    process.exit(0);
  } catch (error) {
    console.error("\nFailed to update user:", error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Unexpected error:", error);
  process.exit(1);
});
