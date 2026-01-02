// Script to list all seasons

import { createSeasonRepository } from "../../src/infrastructure/repositories/index.js";

async function main() {
  try {
    const seasonRepository = createSeasonRepository();

    const allSeasons = await seasonRepository.getAllSeasons();

    console.log(`\nFound ${allSeasons.length} season(s):\n`);

    if (allSeasons.length === 0) {
      console.log("No seasons found.");
    } else {
      for (const season of allSeasons) {
        console.log(
          JSON.stringify(
            {
              id: season.id,
              name: season.name,
              year: season.year,
              startDate: season.startDate.toISOString().split("T")[0],
              endDate: season.endDate.toISOString().split("T")[0],
              createdAt: season.createdAt,
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
    console.error("\nFailed to list seasons:", error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Unexpected error:", error);
  process.exit(1);
});
