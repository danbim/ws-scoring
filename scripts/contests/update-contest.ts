// Interactive script to update a contest

import type { UpdateContestInput } from "../../src/domain/contest/types.js";
import { createContestRepository } from "../../src/infrastructure/repositories/index.js";
import { prompt } from "../prompt.js";

async function main() {
  console.log("Update an existing contest\n");

  const contestId = await prompt("Contest ID");

  try {
    const contestRepository = createContestRepository();
    const contest = await contestRepository.getContestById(contestId);

    if (!contest) {
      console.error("\nError: Contest not found");
      process.exit(1);
    }

    console.log("\nCurrent contest:");
    console.log(
      JSON.stringify(
        {
          id: contest.id,
          seasonId: contest.seasonId,
          name: contest.name,
          location: contest.location,
          startDate: contest.startDate.toISOString().split("T")[0],
          endDate: contest.endDate.toISOString().split("T")[0],
          status: contest.status,
        },
        null,
        2
      )
    );
    console.log("\nEnter new values (leave empty to keep current):\n");

    const newSeasonId = await prompt("Season ID", contest.seasonId);
    const newName = await prompt("Name", contest.name);
    const newLocation = await prompt("Location", contest.location);
    const newStartDateInput = await prompt(
      "Start date (YYYY-MM-DD)",
      contest.startDate.toISOString().split("T")[0]
    );
    const newStartDate = new Date(newStartDateInput);
    if (Number.isNaN(newStartDate.getTime())) {
      console.error("\nError: Start date must be a valid date in YYYY-MM-DD format");
      process.exit(1);
    }

    const newEndDateInput = await prompt(
      "End date (YYYY-MM-DD)",
      contest.endDate.toISOString().split("T")[0]
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

    const newStatusInput = await prompt("Status", contest.status);
    const newStatus = newStatusInput as typeof contest.status;

    const updates: UpdateContestInput = {};
    if (newSeasonId !== contest.seasonId) {
      updates.seasonId = newSeasonId;
    }
    if (newName !== contest.name) {
      updates.name = newName;
    }
    if (newLocation !== contest.location) {
      updates.location = newLocation;
    }
    if (newStartDateInput !== contest.startDate.toISOString().split("T")[0]) {
      updates.startDate = newStartDate;
    }
    if (newEndDateInput !== contest.endDate.toISOString().split("T")[0]) {
      updates.endDate = newEndDate;
    }
    if (newStatus !== contest.status) {
      updates.status = newStatus;
    }

    if (Object.keys(updates).length === 0) {
      console.log("\nNo changes to apply.");
      process.exit(0);
    }

    const updatedContest = await contestRepository.updateContest(contestId, updates);

    console.log("\nContest updated successfully!");
    console.log(
      JSON.stringify(
        {
          id: updatedContest.id,
          seasonId: updatedContest.seasonId,
          name: updatedContest.name,
          location: updatedContest.location,
          startDate: updatedContest.startDate.toISOString().split("T")[0],
          endDate: updatedContest.endDate.toISOString().split("T")[0],
          status: updatedContest.status,
        },
        null,
        2
      )
    );
    process.exit(0);
  } catch (error) {
    console.error("\nFailed to update contest:", error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Unexpected error:", error);
  process.exit(1);
});
