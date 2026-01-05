// Script to seed the database with sample data using repositories

import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { CreateRiderInput } from "../../src/domain/rider/types.js";
import {
  createBracketRepository,
  createContestRepository,
  createDivisionParticipantRepository,
  createDivisionRepository,
  createRiderRepository,
  createSeasonRepository,
} from "../../src/infrastructure/repositories/index.js";
import { predictGender } from "./gender-prediction.js";
import { generateSeedConfig, type ScrapedRider, scrapedRiderToCreateInput } from "./seed-data.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PWA_RIDERS_FILE = join(__dirname, "pwa-riders.json");
const dryRun = process.argv.includes("--dry-run");

// Helper to get random number between min and max (inclusive)
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Shuffle array using Fisher-Yates algorithm
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

async function loadPwaRiders(): Promise<ScrapedRider[]> {
  try {
    const fileContent = await readFile(PWA_RIDERS_FILE, "utf-8");
    const riders: ScrapedRider[] = JSON.parse(fileContent);
    return riders;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      console.error(
        `\n✗ Error: ${PWA_RIDERS_FILE} not found.\n` +
          `  Please run the scraping script first:\n` +
          `  bun run scripts/db/scrape-pwa-riders.ts\n`
      );
    } else {
      console.error(`\n✗ Error reading ${PWA_RIDERS_FILE}:`, error);
    }
    process.exit(1);
  }
}

async function seedDatabase() {
  if (dryRun) {
    console.log("🔍 DRY RUN MODE - No changes will be made\n");
  }

  console.log("Loading PWA riders from JSON file...");
  const scrapedRiders = await loadPwaRiders();
  console.log(`✓ Loaded ${scrapedRiders.length} riders from JSON\n`);

  // Initialize repositories
  const riderRepository = createRiderRepository();
  const seasonRepository = createSeasonRepository();
  const contestRepository = createContestRepository();
  const divisionRepository = createDivisionRepository();
  const bracketRepository = createBracketRepository();
  const participantRepository = createDivisionParticipantRepository();

  // Generate seed configuration
  const config = generateSeedConfig();

  const stats = {
    ridersCreated: 0,
    seasonCreated: false,
    contestsCreated: 0,
    divisionsCreated: 0,
    bracketsCreated: 0,
    participantsAdded: 0,
    errors: [] as Array<{ entity: string; error: string }>,
  };

  try {
    // Step 1: Create riders
    console.log("=".repeat(50));
    console.log("Step 1: Creating riders");
    console.log("=".repeat(50));

    const createdRiders: Array<{
      id: string;
      input: CreateRiderInput;
      gender: "male" | "female" | "unknown";
    }> = [];

    for (const scrapedRider of scrapedRiders) {
      try {
        const riderInput = scrapedRiderToCreateInput(scrapedRider);
        const gender = predictGender(scrapedRider.firstName);

        if (dryRun) {
          console.log(
            `  [DRY RUN] Would create rider: ${riderInput.firstName} ${riderInput.lastName} (${riderInput.sailNumber}, ${riderInput.country}) - ${gender}`
          );
          // Generate a mock ID for dry run
          createdRiders.push({
            id: `mock-${scrapedRider.sailNumber}`,
            input: riderInput,
            gender,
          });
        } else {
          const rider = await riderRepository.createRider(riderInput);
          createdRiders.push({ id: rider.id, input: riderInput, gender });
          console.log(
            `  ✓ Created rider: ${rider.firstName} ${rider.lastName} (${rider.sailNumber})`
          );
        }
        stats.ridersCreated++;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(`  ✗ Failed to create rider ${scrapedRider.sailNumber}: ${errorMsg}`);
        stats.errors.push({ entity: `rider-${scrapedRider.sailNumber}`, error: errorMsg });
      }
    }

    console.log(`\n✓ Created ${stats.ridersCreated} riders\n`);

    // Step 2: Create season
    console.log("=".repeat(50));
    console.log("Step 2: Creating season");
    console.log("=".repeat(50));

    let seasonId: string;
    if (dryRun) {
      console.log(`  [DRY RUN] Would create season: ${config.season.name} (${config.season.year})`);
      seasonId = "mock-season-id";
      stats.seasonCreated = true;
    } else {
      const season = await seasonRepository.createSeason(config.season);
      seasonId = season.id;
      stats.seasonCreated = true;
      console.log(`  ✓ Created season: ${season.name} (ID: ${season.id})\n`);
    }

    // Update contest season IDs
    config.contests.forEach((contest) => {
      contest.seasonId = seasonId;
    });

    // Step 3: Create contests
    console.log("=".repeat(50));
    console.log("Step 3: Creating contests");
    console.log("=".repeat(50));

    const contestIds = new Map<string, string>();

    for (const contestInput of config.contests) {
      try {
        if (dryRun) {
          console.log(
            `  [DRY RUN] Would create contest: ${contestInput.name} at ${contestInput.location}`
          );
          const mockId = `mock-contest-${contestInput.name}`;
          contestIds.set(contestInput.name, mockId);
          stats.contestsCreated++;
        } else {
          const contest = await contestRepository.createContest(contestInput);
          contestIds.set(contest.name, contest.id);
          stats.contestsCreated++;
          console.log(`  ✓ Created contest: ${contest.name} (ID: ${contest.id})`);
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(`  ✗ Failed to create contest ${contestInput.name}: ${errorMsg}`);
        stats.errors.push({ entity: `contest-${contestInput.name}`, error: errorMsg });
      }
    }

    console.log(`\n✓ Created ${stats.contestsCreated} contests\n`);

    // Step 4: Create divisions
    console.log("=".repeat(50));
    console.log("Step 4: Creating divisions");
    console.log("=".repeat(50));

    const divisionIds = new Map<string, string>();

    for (const divisionGroup of config.divisions) {
      const contestId = contestIds.get(divisionGroup.contestName);
      if (!contestId) {
        console.error(`  ✗ Contest not found: ${divisionGroup.contestName}`);
        continue;
      }

      for (const divisionInput of divisionGroup.divisions) {
        try {
          divisionInput.contestId = contestId;
          const divisionKey = `${divisionGroup.contestName}-${divisionInput.name}`;

          if (dryRun) {
            console.log(
              `  [DRY RUN] Would create division: ${divisionInput.name} (${divisionInput.category}) in ${divisionGroup.contestName}`
            );
            divisionIds.set(divisionKey, `mock-division-${divisionKey}`);
            stats.divisionsCreated++;
          } else {
            const division = await divisionRepository.createDivision(divisionInput);
            divisionIds.set(divisionKey, division.id);
            stats.divisionsCreated++;
            console.log(`  ✓ Created division: ${division.name} (ID: ${division.id})`);
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          console.error(`  ✗ Failed to create division ${divisionInput.name}: ${errorMsg}`);
          stats.errors.push({ entity: `division-${divisionInput.name}`, error: errorMsg });
        }
      }
    }

    console.log(`\n✓ Created ${stats.divisionsCreated} divisions\n`);

    // Step 5: Create brackets
    console.log("=".repeat(50));
    console.log("Step 5: Creating brackets");
    console.log("=".repeat(50));

    for (const bracketGroup of config.brackets) {
      const divisionKey = `${bracketGroup.contestName}-${bracketGroup.divisionName}`;
      const divisionId = divisionIds.get(divisionKey);
      if (!divisionId) {
        console.error(`  ✗ Division not found: ${divisionKey}`);
        continue;
      }

      for (const bracketInput of bracketGroup.brackets) {
        try {
          bracketInput.divisionId = divisionId;

          if (dryRun) {
            console.log(
              `  [DRY RUN] Would create bracket: ${bracketInput.name} (${bracketInput.format}) in ${bracketGroup.divisionName}`
            );
            stats.bracketsCreated++;
          } else {
            const bracket = await bracketRepository.createBracket(bracketInput);
            stats.bracketsCreated++;
            console.log(`  ✓ Created bracket: ${bracket.name} (ID: ${bracket.id})`);
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          console.error(`  ✗ Failed to create bracket ${bracketInput.name}: ${errorMsg}`);
          stats.errors.push({ entity: `bracket-${bracketInput.name}`, error: errorMsg });
        }
      }
    }

    console.log(`\n✓ Created ${stats.bracketsCreated} brackets\n`);

    // Step 6: Add participants to divisions
    console.log("=".repeat(50));
    console.log("Step 6: Adding participants to divisions");
    console.log("=".repeat(50));

    // Separate riders by gender
    const maleRiders = createdRiders.filter((r) => r.gender === "male");
    const femaleRiders = createdRiders.filter((r) => r.gender === "female");

    console.log(`  Available riders: ${maleRiders.length} male, ${femaleRiders.length} female\n`);

    for (const divisionGroup of config.divisions) {
      for (const divisionInput of divisionGroup.divisions) {
        const divisionKey = `${divisionGroup.contestName}-${divisionInput.name}`;
        const divisionId = divisionIds.get(divisionKey);
        if (!divisionId) {
          console.error(`  ✗ Division not found: ${divisionKey}`);
          continue;
        }

        // Select riders based on division category
        let eligibleRiders: Array<{ id: string; input: CreateRiderInput }>;
        if (divisionInput.category === "pro_men") {
          eligibleRiders = maleRiders.map((r) => ({ id: r.id, input: r.input }));
        } else if (divisionInput.category === "pro_women") {
          eligibleRiders = femaleRiders.map((r) => ({ id: r.id, input: r.input }));
        } else {
          // For other categories, use all riders
          eligibleRiders = createdRiders.map((r) => ({ id: r.id, input: r.input }));
        }

        if (eligibleRiders.length === 0) {
          console.warn(
            `  ⚠ No eligible riders for ${divisionInput.name} (${divisionInput.category})`
          );
          continue;
        }

        // Randomly select between min and max participants
        const numParticipants = Math.min(
          randomInt(config.participantsPerDivision.min, config.participantsPerDivision.max),
          eligibleRiders.length
        );

        // Shuffle and select
        const selectedRiders = shuffleArray(eligibleRiders).slice(0, numParticipants);

        console.log(
          `  Adding ${selectedRiders.length} participants to ${divisionInput.name} (${divisionGroup.contestName})...`
        );

        for (const rider of selectedRiders) {
          try {
            if (dryRun) {
              console.log(
                `    [DRY RUN] Would add participant: ${rider.input.firstName} ${rider.input.lastName} (${rider.input.sailNumber})`
              );
              stats.participantsAdded++;
            } else {
              await participantRepository.addParticipant(divisionId, rider.id);
              stats.participantsAdded++;
            }
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            console.error(`    ✗ Failed to add participant ${rider.input.sailNumber}: ${errorMsg}`);
            stats.errors.push({
              entity: `participant-${rider.input.sailNumber}`,
              error: errorMsg,
            });
          }
        }
      }
    }

    console.log(`\n✓ Added ${stats.participantsAdded} participants\n`);

    // Summary
    console.log("=".repeat(50));
    if (dryRun) {
      console.log("DRY RUN SUMMARY:");
    } else {
      console.log("SEED SUMMARY:");
    }
    console.log("=".repeat(50));
    console.log(`  Riders created: ${stats.ridersCreated}`);
    console.log(`  Season created: ${stats.seasonCreated ? "Yes" : "No"}`);
    console.log(`  Contests created: ${stats.contestsCreated}`);
    console.log(`  Divisions created: ${stats.divisionsCreated}`);
    console.log(`  Brackets created: ${stats.bracketsCreated}`);
    console.log(`  Participants added: ${stats.participantsAdded}`);

    if (stats.errors.length > 0) {
      console.log(`\n  Errors: ${stats.errors.length}`);
      for (const err of stats.errors) {
        console.log(`    - ${err.entity}: ${err.error}`);
      }
      process.exit(1);
    } else {
      if (dryRun) {
        console.log("\n✓ Dry run completed successfully. Run without --dry-run to apply changes.");
      } else {
        console.log("\n✓ Database seeded successfully!");
      }
    }
  } catch (error) {
    console.error("\n✗ Unexpected error during seeding:", error);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.main) {
  seedDatabase().catch((error) => {
    console.error("Unexpected error:", error);
    process.exit(1);
  });
}
