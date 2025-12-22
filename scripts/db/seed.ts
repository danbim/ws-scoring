// Script to seed the database with sample data via API

import { seedData } from "./seed-data.js";

const API_URL = process.env.API_URL || "http://localhost:3000";
const dryRun = process.argv.includes("--dry-run");

async function createHeat(heatConfig: {
  heatId: string;
  riderIds: string[];
  heatRules: { wavesCounting: number; jumpsCounting: number };
}): Promise<void> {
  const requestBody = {
    heatId: heatConfig.heatId,
    riderIds: heatConfig.riderIds,
    heatRules: heatConfig.heatRules,
  };

  const response = await fetch(`${API_URL}/api/heats`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || `HTTP ${response.status}`);
  }
}

async function addWaveScore(
  heatId: string,
  scoreConfig: {
    riderId: string;
    scoreUUID: string;
    waveScore: number;
  }
): Promise<void> {
  const requestBody = {
    heatId,
    riderId: scoreConfig.riderId,
    scoreUUID: scoreConfig.scoreUUID,
    waveScore: scoreConfig.waveScore,
  };

  const response = await fetch(`${API_URL}/api/heats/${heatId}/scores/wave`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || `HTTP ${response.status}`);
  }
}

async function addJumpScore(
  heatId: string,
  scoreConfig: {
    riderId: string;
    scoreUUID: string;
    jumpScore: number;
    jumpType: string;
  }
): Promise<void> {
  const requestBody = {
    heatId,
    riderId: scoreConfig.riderId,
    scoreUUID: scoreConfig.scoreUUID,
    jumpScore: scoreConfig.jumpScore,
    jumpType: scoreConfig.jumpType,
  };

  const response = await fetch(`${API_URL}/api/heats/${heatId}/scores/jump`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || `HTTP ${response.status}`);
  }
}

async function seedDatabase() {
  if (dryRun) {
    console.log("🔍 DRY RUN MODE - No changes will be made\n");
  }

  console.log(`Loading seed data: ${seedData.heats.length} heat(s) to create\n`);
  console.log(`API URL: ${API_URL}\n`);

  // Check if API is reachable (only in non-dry-run mode)
  if (!dryRun) {
    try {
      await fetch(`${API_URL}/api/heats`, { method: "GET" });
      // We don't care about the response, just that we can reach the server
    } catch (e) {
      console.error(e);
      console.error(
        `✗ Cannot reach API at ${API_URL}. Please ensure the server is running.\n` +
          `  Start the server with: bun run dev\n` +
          `  Or with docker: bun run docker:dev\n`
      );
      process.exit(1);
    }
  }

  let createdHeats = 0;
  let createdScores = 0;
  const errors: Array<{ heatId: string; error: string }> = [];

  for (const heatConfig of seedData.heats) {
    try {
      // Create heat
      console.log(`Creating heat: ${heatConfig.heatId}`);
      if (!dryRun) {
        await createHeat(heatConfig);
        createdHeats++;
        console.log(`  ✓ Heat created with ${heatConfig.riderIds.length} rider(s)`);
      } else {
        console.log(`  [DRY RUN] Would create heat with ${heatConfig.riderIds.length} rider(s)`);
        createdHeats++;
      }

      // Add scores if any
      if (heatConfig.scores && heatConfig.scores.length > 0) {
        console.log(`  Adding ${heatConfig.scores.length} score(s)...`);

        for (const scoreConfig of heatConfig.scores) {
          try {
            if (scoreConfig.type === "wave") {
              if (!dryRun) {
                await addWaveScore(heatConfig.heatId, {
                  riderId: scoreConfig.riderId,
                  scoreUUID: scoreConfig.scoreUUID,
                  waveScore: scoreConfig.waveScore,
                });
                createdScores++;
              } else {
                console.log(
                  `    [DRY RUN] Would add wave score: ${scoreConfig.riderId} = ${scoreConfig.waveScore}`
                );
                createdScores++;
              }
            } else if (scoreConfig.type === "jump") {
              if (!dryRun) {
                await addJumpScore(heatConfig.heatId, {
                  riderId: scoreConfig.riderId,
                  scoreUUID: scoreConfig.scoreUUID,
                  jumpScore: scoreConfig.jumpScore,
                  jumpType: scoreConfig.jumpType,
                });
                createdScores++;
              } else {
                console.log(
                  `    [DRY RUN] Would add jump score: ${scoreConfig.riderId} = ${scoreConfig.jumpScore} (${scoreConfig.jumpType})`
                );
                createdScores++;
              }
            }
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            console.error(`    ✗ Failed to add score ${scoreConfig.scoreUUID}: ${errorMsg}`);
            errors.push({
              heatId: heatConfig.heatId,
              error: `Score ${scoreConfig.scoreUUID}: ${errorMsg}`,
            });
          }
        }
      }

      console.log("");
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`✗ Failed to create heat ${heatConfig.heatId}: ${errorMsg}\n`);
      errors.push({ heatId: heatConfig.heatId, error: errorMsg });
    }
  }

  // Summary
  console.log("=".repeat(50));
  if (dryRun) {
    console.log("DRY RUN SUMMARY:");
  } else {
    console.log("SEED SUMMARY:");
  }
  console.log(`  Heats created: ${createdHeats}/${seedData.heats.length}`);
  console.log(`  Scores created: ${createdScores}`);

  if (errors.length > 0) {
    console.log(`\n  Errors: ${errors.length}`);
    for (const err of errors) {
      console.log(`    - ${err.heatId}: ${err.error}`);
    }
    process.exit(1);
  } else {
    if (dryRun) {
      console.log("\n✓ Dry run completed successfully. Run without --dry-run to apply changes.");
    } else {
      console.log("\n✓ Database seeded successfully!");
    }
  }
}

// Run if executed directly
if (import.meta.main) {
  seedDatabase().catch((error) => {
    console.error("Unexpected error:", error);
    process.exit(1);
  });
}
