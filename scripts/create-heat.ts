// Interactive script to create a heat

import { parseCommaSeparated, prompt, promptInteger } from "./prompt.js";

const API_URL = process.env.API_URL || "http://localhost:3000";

async function main() {
  console.log("Create a new heat\n");

  const heatId = await prompt("Heat ID", "29a");
  const bracketId = await prompt("Bracket ID");
  const riderIdsInput = await prompt("Rider IDs (comma-separated)", "rider-1,rider-2");
  const riderIds = parseCommaSeparated(riderIdsInput);
  const wavesCounting = await promptInteger("Waves counting", 2);
  const jumpsCounting = await promptInteger("Jumps counting", 1);

  const requestBody = {
    heatId,
    bracketId,
    riderIds,
    heatRules: {
      wavesCounting,
      jumpsCounting,
    },
  };

  console.log("\nSubmitting request...");

  try {
    const response = await fetch(`${API_URL}/api/heats`, {
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

    console.log("Heat created successfully!");
    console.log(JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("Failed to create heat:", error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Unexpected error:", error);
  process.exit(1);
});
