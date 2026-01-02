// Interactive script to delete a division

import { createDivisionRepository } from "../../src/infrastructure/repositories/index.js";
import { prompt } from "../prompt.js";

async function main() {
  console.log("Delete a division\n");

  const divisionId = await prompt("Division ID");

  try {
    const divisionRepository = createDivisionRepository();
    const division = await divisionRepository.getDivisionById(divisionId);

    if (!division) {
      console.error("\nError: Division not found");
      process.exit(1);
    }

    console.log("\nDivision to delete:");
    console.log(
      JSON.stringify(
        {
          id: division.id,
          contestId: division.contestId,
          name: division.name,
          category: division.category,
        },
        null,
        2
      )
    );

    const confirm = await prompt("\nAre you sure you want to delete this division? (yes/no)", "no");

    if (confirm.toLowerCase() !== "yes") {
      console.log("\nDeletion cancelled.");
      process.exit(0);
    }

    await divisionRepository.deleteDivision(divisionId);

    console.log("\nDivision deleted successfully!");
    process.exit(0);
  } catch (error) {
    console.error("\nFailed to delete division:", error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Unexpected error:", error);
  process.exit(1);
});
