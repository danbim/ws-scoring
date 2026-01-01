// Script to list all divisions

import { createDivisionRepository } from "../../src/infrastructure/repositories/index.js";

async function main() {
  try {
    const divisionRepository = createDivisionRepository();

    const allDivisions = await divisionRepository.getAllDivisions();

    console.log(`\nFound ${allDivisions.length} division(s):\n`);

    if (allDivisions.length === 0) {
      console.log("No divisions found.");
    } else {
      for (const division of allDivisions) {
        console.log(
          JSON.stringify(
            {
              id: division.id,
              contestId: division.contestId,
              name: division.name,
              category: division.category,
              createdAt: division.createdAt,
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
    console.error("\nFailed to list divisions:", error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Unexpected error:", error);
  process.exit(1);
});
