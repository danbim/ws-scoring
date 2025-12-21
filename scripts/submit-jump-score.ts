// Interactive script to submit a jump score

import { prompt, promptNumber } from "./prompt.js";

const API_URL = process.env.API_URL || "http://localhost:3000";

const JUMP_TYPES = [
  "forward",
  "backloop",
  "doubleForward",
  "pushLoop",
  "pushForward",
  "tableTop",
  "cheeseRoll",
] as const;

async function promptJumpType(defaultValue: string = "forward"): Promise<string> {
  console.log("\nJump types:");
  JUMP_TYPES.forEach((type, index) => {
    const marker = type === defaultValue ? " (default)" : "";
    console.log(`  ${index + 1}. ${type}${marker}`);
  });

  while (true) {
    const input = await prompt(`Jump type (1-${JUMP_TYPES.length} or name)`, defaultValue);
    const trimmed = input.trim().toLowerCase();

    // Check if it's a number
    const number = parseInt(trimmed, 10);
    if (!Number.isNaN(number) && number >= 1 && number <= JUMP_TYPES.length) {
      return JUMP_TYPES[number - 1];
    }

    // Check if it's a valid jump type name
    const validTypes: readonly string[] = JUMP_TYPES;
    if (validTypes.includes(trimmed)) {
      return trimmed;
    }

    // If it's empty and we have a default, use it
    if (trimmed === "" && defaultValue) {
      return defaultValue;
    }

    console.log("Please enter a valid jump type number or name.");
  }
}

async function main() {
  console.log("Submit a jump score\n");

  const heatId = await prompt("Heat ID", "29a");
  const riderId = await prompt("Rider ID", "rider-1");
  const scoreUUID = await prompt("Score UUID", crypto.randomUUID());
  const jumpType = await promptJumpType("forward");
  const jumpScore = await promptNumber("Jump score (0-10)", 7.5);

  const requestBody = {
    heatId,
    riderId,
    scoreUUID,
    jumpType,
    jumpScore,
  };

  console.log("\nSubmitting request...");

  try {
    const response = await fetch(`${API_URL}/api/heats/${heatId}/scores/jump`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error(`Error: ${data.error || "Unknown error"}`);
      process.exit(1);
    }

    console.log("Jump score submitted successfully!");
    console.log(JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("Failed to submit jump score:", error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Unexpected error:", error);
  process.exit(1);
});
