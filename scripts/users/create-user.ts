// Interactive script to create a user

import { eq } from "drizzle-orm";
import type { CreateUserInput, UserRole } from "../../src/domain/user/types.js";
import { hashPassword, validateUserInput } from "../../src/domain/user/user-service.js";
import { connectDb, disconnectDb } from "../../src/infrastructure/db/index.js";
import { users } from "../../src/infrastructure/db/schema.js";
import { prompt } from "../prompt.js";

async function main() {
  console.log("Create a new user\n");

  const username = await prompt("Username");
  const email = await prompt("Email (optional)", "");
  const password = await prompt("Password");
  const roleInput = await prompt("Role (judge, head_judge, administrator)", "judge");

  const role = roleInput as UserRole;

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
    const db = await connectDb();

    // Check if username already exists
    const existing = await db.select().from(users).where(eq(users.username, username)).limit(1);

    if (existing.length > 0) {
      console.error("\nError: Username already exists");
      await disconnectDb();
      process.exit(1);
    }

    const passwordHash = await hashPassword(password);

    const [newUser] = await db
      .insert(users)
      .values({
        username,
        email: email || null,
        passwordHash,
        role,
      })
      .returning();

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

    await disconnectDb();
  } catch (error) {
    console.error("\nFailed to create user:", error);
    await disconnectDb();
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Unexpected error:", error);
  process.exit(1);
});
