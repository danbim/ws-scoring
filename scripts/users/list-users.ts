// Script to list all users

import { createUserRepository } from "../../src/infrastructure/repositories/index.js";

async function main() {
  try {
    const userRepository = createUserRepository();

    const allUsers = await userRepository.getAllUsers();

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
    process.exit(0);
  } catch (error) {
    console.error("\nFailed to list users:", error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Unexpected error:", error);
  process.exit(1);
});
