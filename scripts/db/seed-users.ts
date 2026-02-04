// Create test users for E2E screenshot generation
// Non-interactive — used by CI and local E2E setup

import type { CreateUserInput } from "../../src/domain/user/types.js";
import { getDb } from "../../src/infrastructure/db/index.js";
import { createUserRepository } from "../../src/infrastructure/repositories/index.js";

const TEST_USERS: CreateUserInput[] = [
  {
    username: "judge1",
    password: "password123",
    role: "judge",
    email: null,
  },
  {
    username: "judge2",
    password: "password123",
    role: "judge",
    email: null,
  },
  {
    username: "headjudge",
    password: "password123",
    role: "head_judge",
    email: null,
  },
];

async function seedUsers() {
  const db = await getDb();
  const userRepository = createUserRepository(db);

  for (const userInput of TEST_USERS) {
    const existing = await userRepository.getUserByUsername(userInput.username);
    if (existing) {
      console.log(`  User "${userInput.username}" already exists, skipping`);
      continue;
    }
    const user = await userRepository.createUser(userInput);
    console.log(`  Created user: ${user.username} (${user.role})`);
  }

  console.log("\nTest users ready.");
  process.exit(0);
}

if (import.meta.main) {
  seedUsers().catch((error) => {
    console.error("Failed to seed users:", error);
    process.exit(1);
  });
}
