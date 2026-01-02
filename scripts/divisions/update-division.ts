// Interactive script to update a division

import type { UpdateDivisionInput } from "../../src/domain/contest/types.js";
import { createDivisionRepository } from "../../src/infrastructure/repositories/index.js";
import { prompt } from "../prompt.js";

async function main() {
  console.log("Update an existing division\n");

  const divisionId = await prompt("Division ID");

  try {
    const divisionRepository = createDivisionRepository();
    const division = await divisionRepository.getDivisionById(divisionId);

    if (!division) {
      console.error("\nError: Division not found");
      process.exit(1);
    }

    console.log("\nCurrent division:");
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
    console.log("\nEnter new values (leave empty to keep current):\n");

    const newContestId = await prompt("Contest ID", division.contestId);
    const newName = await prompt("Name", division.name);
    const newCategoryInput = await prompt("Category", division.category);
    const newCategory = newCategoryInput as typeof division.category;

    const updates: UpdateDivisionInput = {};
    if (newContestId !== division.contestId) {
      updates.contestId = newContestId;
    }
    if (newName !== division.name) {
      updates.name = newName;
    }
    if (newCategory !== division.category) {
      updates.category = newCategory;
    }

    if (Object.keys(updates).length === 0) {
      console.log("\nNo changes to apply.");
      process.exit(0);
    }

    const updatedDivision = await divisionRepository.updateDivision(divisionId, updates);

    console.log("\nDivision updated successfully!");
    console.log(
      JSON.stringify(
        {
          id: updatedDivision.id,
          contestId: updatedDivision.contestId,
          name: updatedDivision.name,
          category: updatedDivision.category,
        },
        null,
        2
      )
    );
    process.exit(0);
  } catch (error) {
    console.error("\nFailed to update division:", error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Unexpected error:", error);
  process.exit(1);
});
