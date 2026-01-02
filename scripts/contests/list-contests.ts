// Script to list all contests

import { createContestRepository } from "../../src/infrastructure/repositories/index.js";

async function main() {
  try {
    const contestRepository = createContestRepository();

    const allContests = await contestRepository.getAllContests();

    console.log(`\nFound ${allContests.length} contest(s):\n`);

    if (allContests.length === 0) {
      console.log("No contests found.");
    } else {
      for (const contest of allContests) {
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
              createdAt: contest.createdAt,
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
    console.error("\nFailed to list contests:", error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Unexpected error:", error);
  process.exit(1);
});
