// Interactive script to change a user's password

import { hashPassword, validatePassword } from "../../src/domain/user/user-service.js";
import { createUserRepository } from "../../src/infrastructure/repositories/index.js";
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
    const userRepository = createUserRepository();

    const user = await userRepository.getUserByUsername(username);

    if (!user) {
      console.error(`\nError: User with username "${username}" not found`);
      process.exit(1);
    }

    const passwordHash = await hashPassword(newPassword);

    await userRepository.updateUserPassword(user.id, passwordHash);

    const updatedUser = await userRepository.getUserById(user.id);

    console.log("\nPassword changed successfully!");
    console.log(
      JSON.stringify(
        {
          id: updatedUser?.id,
          username: updatedUser?.username,
        },
        null,
        2
      )
    );
    process.exit(0);
  } catch (error) {
    console.error("\nFailed to change password:", error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Unexpected error:", error);
  process.exit(1);
});
