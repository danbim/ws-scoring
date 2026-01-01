// Interactive script to create a contest

import type { CreateContestInput } from "../../src/domain/contest/types.js";
import { createContestRepository } from "../../src/infrastructure/repositories/index.js";
import { prompt } from "../prompt.js";

async function main() {
  console.log("Create a new contest\n");

  const seasonId = await prompt("Season ID");
  const name = await prompt("Name");
  const location = await prompt("Location");
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

  const statusInput = await prompt(
    "Status (draft, scheduled, in_progress, completed, cancelled)",
    "draft"
  );
  const status = statusInput as CreateContestInput["status"];

  const contestInput: CreateContestInput = {
    seasonId,
    name,
    location,
    startDate,
    endDate,
    status,
  };

  try {
    const contestRepository = createContestRepository();
    const newContest = await contestRepository.createContest(contestInput);

    console.log("\nContest created successfully!");
    console.log(
      JSON.stringify(
        {
          id: newContest.id,
          seasonId: newContest.seasonId,
          name: newContest.name,
          location: newContest.location,
          startDate: newContest.startDate.toISOString().split("T")[0],
          endDate: newContest.endDate.toISOString().split("T")[0],
          status: newContest.status,
        },
        null,
        2
      )
    );
    process.exit(0);
  } catch (error) {
    console.error("\nFailed to create contest:", error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Unexpected error:", error);
  process.exit(1);
});
