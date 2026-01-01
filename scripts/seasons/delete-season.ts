// Interactive script to delete a season

import { createSeasonRepository } from "../../src/infrastructure/repositories/index.js";
import { prompt } from "../prompt.js";

async function main() {
  console.log("Delete a season\n");

  const seasonId = await prompt("Season ID");

  try {
    const seasonRepository = createSeasonRepository();
    const season = await seasonRepository.getSeasonById(seasonId);

    if (!season) {
      console.error("\nError: Season not found");
      process.exit(1);
    }

    console.log("\nSeason to delete:");
    console.log(
      JSON.stringify(
        {
          id: season.id,
          name: season.name,
          year: season.year,
          startDate: season.startDate.toISOString().split("T")[0],
          endDate: season.endDate.toISOString().split("T")[0],
        },
        null,
        2
      )
    );

    const confirm = await prompt("\nAre you sure you want to delete this season? (yes/no)", "no");

    if (confirm.toLowerCase() !== "yes") {
      console.log("\nDeletion cancelled.");
      process.exit(0);
    }

    await seasonRepository.deleteSeason(seasonId);

    console.log("\nSeason deleted successfully!");
    process.exit(0);
  } catch (error) {
    console.error("\nFailed to delete season:", error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Unexpected error:", error);
  process.exit(1);
});
