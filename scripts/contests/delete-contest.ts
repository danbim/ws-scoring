// Interactive script to delete a contest

import { createContestRepository } from "../../src/infrastructure/repositories/index.js";
import { prompt } from "../prompt.js";

async function main() {
  console.log("Delete a contest\n");

  const contestId = await prompt("Contest ID");

  try {
    const contestRepository = createContestRepository();
    const contest = await contestRepository.getContestById(contestId);

    if (!contest) {
      console.error("\nError: Contest not found");
      process.exit(1);
    }

    console.log("\nContest to delete:");
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

    const confirm = await prompt("\nAre you sure you want to delete this contest? (yes/no)", "no");

    if (confirm.toLowerCase() !== "yes") {
      console.log("\nDeletion cancelled.");
      process.exit(0);
    }

    await contestRepository.deleteContest(contestId);

    console.log("\nContest deleted successfully!");
    process.exit(0);
  } catch (error) {
    console.error("\nFailed to delete contest:", error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Unexpected error:", error);
  process.exit(1);
});
