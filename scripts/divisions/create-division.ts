// Interactive script to create a division

import type { CreateDivisionInput } from "../../src/domain/contest/types.js";
import { createDivisionRepository } from "../../src/infrastructure/repositories/index.js";
import { prompt } from "../prompt.js";

async function main() {
  console.log("Create a new division\n");

  const contestId = await prompt("Contest ID");
  const name = await prompt("Name");
  const categoryInput = await prompt(
    "Category (pro_men, pro_women, amateur_men, amateur_women, pro_youth, amateur_youth, pro_masters, amateur_masters)",
    "pro_men"
  );
  const category = categoryInput as CreateDivisionInput["category"];

  const divisionInput: CreateDivisionInput = {
    contestId,
    name,
    category,
  };

  try {
    const divisionRepository = createDivisionRepository();
    const newDivision = await divisionRepository.createDivision(divisionInput);

    console.log("\nDivision created successfully!");
    console.log(
      JSON.stringify(
        {
          id: newDivision.id,
          contestId: newDivision.contestId,
          name: newDivision.name,
          category: newDivision.category,
        },
        null,
        2
      )
    );
    process.exit(0);
  } catch (error) {
    console.error("\nFailed to create division:", error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Unexpected error:", error);
  process.exit(1);
});
