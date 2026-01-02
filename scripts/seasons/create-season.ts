// Interactive script to create a season

import type { CreateSeasonInput } from "../../src/domain/contest/types.js";
import { createSeasonRepository } from "../../src/infrastructure/repositories/index.js";
import { prompt } from "../prompt.js";

async function main() {
  console.log("Create a new season\n");

  const name = await prompt("Name");
  const yearInput = await prompt("Year");
  const year = parseInt(yearInput, 10);
  if (Number.isNaN(year)) {
    console.error("\nError: Year must be a valid number");
    process.exit(1);
  }

  const startDateInput = await prompt("Start date (YYYY-MM-DD)");
  const startDate = new Date(startDateInput);
  if (Number.isNaN(startDate.getTime())) {
    console.error("\nError: Start date must be a valid date in YYYY-MM-DD format");
    process.exit(1);
  }

  const endDateInput = await prompt("End date (YYYY-MM-DD)");
  const endDate = new Date(endDateInput);
  if (Number.isNaN(endDate.getTime())) {
    console.error("\nError: End date must be a valid date in YYYY-MM-DD format");
    process.exit(1);
  }

  if (endDate < startDate) {
    console.error("\nError: End date must be after start date");
    process.exit(1);
  }

  const seasonInput: CreateSeasonInput = {
    name,
    year,
    startDate,
    endDate,
  };

  try {
    const seasonRepository = createSeasonRepository();
    const newSeason = await seasonRepository.createSeason(seasonInput);

    console.log("\nSeason created successfully!");
    console.log(
      JSON.stringify(
        {
          id: newSeason.id,
          name: newSeason.name,
          year: newSeason.year,
          startDate: newSeason.startDate.toISOString().split("T")[0],
          endDate: newSeason.endDate.toISOString().split("T")[0],
        },
        null,
        2
      )
    );
    process.exit(0);
  } catch (error) {
    console.error("\nFailed to create season:", error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Unexpected error:", error);
  process.exit(1);
});
