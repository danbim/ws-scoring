// Interactive script to submit a wave score

import { prompt, promptNumber } from "./prompt.js";

const API_URL = process.env.API_URL || "http://localhost:3000";

async function main() {
  console.log("Submit a wave score\n");

  const heatId = await prompt("Heat ID", "29a");
  const riderId = await prompt("Rider ID", "rider-1");
  const scoreUUID = await prompt("Score UUID", crypto.randomUUID());
  const waveScore = await promptNumber("Wave score (0-10)", 7.5);

  const requestBody = {
    heatId,
    riderId,
    scoreUUID,
    waveScore,
  };

  console.log("\nSubmitting request...");

  try {
    const response = await fetch(`${API_URL}/api/heats/${heatId}/scores/wave`, {
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

    console.log("Wave score submitted successfully!");
    console.log(JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("Failed to submit wave score:", error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Unexpected error:", error);
  process.exit(1);
});
