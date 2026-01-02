// Interactive script to update a season

import type { UpdateSeasonInput } from "../../src/domain/contest/types.js";
import { createSeasonRepository } from "../../src/infrastructure/repositories/index.js";
import { prompt } from "../prompt.js";

async function main() {
  console.log("Update an existing season\n");

  const seasonId = await prompt("Season ID");

  try {
    const seasonRepository = createSeasonRepository();
    const season = await seasonRepository.getSeasonById(seasonId);

    if (!season) {
      console.error("\nError: Season not found");
      process.exit(1);
    }

    console.log("\nCurrent season:");
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
    console.log("\nEnter new values (leave empty to keep current):\n");

    const newName = await prompt("Name", season.name);
    const newYearInput = await prompt("Year", season.year.toString());
    const newYear = parseInt(newYearInput, 10);
    if (Number.isNaN(newYear)) {
      console.error("\nError: Year must be a valid number");
      process.exit(1);
    }

    const newStartDateInput = await prompt(
      "Start date (YYYY-MM-DD)",
      season.startDate.toISOString().split("T")[0]
    );
    const newStartDate = new Date(newStartDateInput);
    if (Number.isNaN(newStartDate.getTime())) {
      console.error("\nError: Start date must be a valid date in YYYY-MM-DD format");
      process.exit(1);
    }

    const newEndDateInput = await prompt(
      "End date (YYYY-MM-DD)",
      season.endDate.toISOString().split("T")[0]
    );
    const newEndDate = new Date(newEndDateInput);
    if (Number.isNaN(newEndDate.getTime())) {
      console.error("\nError: End date must be a valid date in YYYY-MM-DD format");
      process.exit(1);
    }

    if (newEndDate < newStartDate) {
      console.error("\nError: End date must be after start date");
      process.exit(1);
    }

    const updates: UpdateSeasonInput = {};
    if (newName !== season.name) {
      updates.name = newName;
    }
    if (newYear !== season.year) {
      updates.year = newYear;
    }
    if (newStartDateInput !== season.startDate.toISOString().split("T")[0]) {
      updates.startDate = newStartDate;
    }
    if (newEndDateInput !== season.endDate.toISOString().split("T")[0]) {
      updates.endDate = newEndDate;
    }

    if (Object.keys(updates).length === 0) {
      console.log("\nNo changes to apply.");
      process.exit(0);
    }

    const updatedSeason = await seasonRepository.updateSeason(seasonId, updates);

    console.log("\nSeason updated successfully!");
    console.log(
      JSON.stringify(
        {
          id: updatedSeason.id,
          name: updatedSeason.name,
          year: updatedSeason.year,
          startDate: updatedSeason.startDate.toISOString().split("T")[0],
          endDate: updatedSeason.endDate.toISOString().split("T")[0],
        },
        null,
        2
      )
    );
    process.exit(0);
  } catch (error) {
    console.error("\nFailed to update season:", error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Unexpected error:", error);
  process.exit(1);
});
