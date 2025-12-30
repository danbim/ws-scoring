// Interactive script to create a user

import type { CreateUserInput } from "../../src/domain/user/types.js";
import { validateUserInput } from "../../src/domain/user/user-service.js";
import { createUserRepository } from "../../src/infrastructure/repositories/index.js";
import { prompt } from "../prompt.js";

async function main() {
  console.log("Create a new user\n");

  const username = await prompt("Username");
  const email = await prompt("Email (optional)", "");
  const password = await prompt("Password");
  const roleInput = await prompt("Role (judge, head_judge, administrator)", "judge");

  const role = roleInput as CreateUserInput["role"];

  const userInput: CreateUserInput = {
    username,
    email: email || null,
    password,
    role,
  };

  const validation = validateUserInput(userInput);
  if (!validation.valid) {
    console.error(`\nError: ${validation.error}`);
    process.exit(1);
  }

  try {
    const userRepository = createUserRepository();

    // Check if username already exists
    const existing = await userRepository.getUserByUsername(username);

    if (existing) {
      console.error("\nError: Username already exists");
      process.exit(1);
    }

    const newUser = await userRepository.createUser(userInput);

    console.log("\nUser created successfully!");
    console.log(
      JSON.stringify(
        {
          id: newUser.id,
          username: newUser.username,
          email: newUser.email,
          role: newUser.role,
        },
        null,
        2
      )
    );
    process.exit(0);
  } catch (error) {
    console.error("\nFailed to create user:", error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Unexpected error:", error);
  process.exit(1);
});
