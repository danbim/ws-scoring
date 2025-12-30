// Interactive script to delete a user

import { createUserRepository } from "../../src/infrastructure/repositories/index.js";
import { prompt } from "../prompt.js";

async function main() {
  console.log("Delete a user\n");

  const username = await prompt("Username to delete");

  try {
    const userRepository = createUserRepository();

    const user = await userRepository.getUserByUsername(username);

    if (!user) {
      console.error(`\nError: User with username "${username}" not found`);
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
      return;
    }

    await userRepository.deleteUser(user.id);

    console.log("\nUser deleted successfully!");
    process.exit(0);
  } catch (error) {
    console.error("\nFailed to delete user:", error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Unexpected error:", error);
  process.exit(1);
});
