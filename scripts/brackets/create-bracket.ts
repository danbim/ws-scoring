// Interactive script to create a bracket

import type { CreateBracketInput } from "../../src/domain/contest/types.js";
import { createBracketRepository } from "../../src/infrastructure/repositories/index.js";
import { prompt } from "../prompt.js";

async function main() {
  console.log("Create a new bracket\n");

  const divisionId = await prompt("Division ID");
  const name = await prompt("Name");
  const formatInput = await prompt(
    "Format (single_elimination, double_elimination, dingle)",
    "single_elimination"
  );
  const format = formatInput as CreateBracketInput["format"];
  const status = await prompt("Status", "draft");

  const bracketInput: CreateBracketInput = {
    divisionId,
    name,
    format,
    status,
  };

  try {
    const bracketRepository = createBracketRepository();
    const newBracket = await bracketRepository.createBracket(bracketInput);

    console.log("\nBracket created successfully!");
    console.log(
      JSON.stringify(
        {
          id: newBracket.id,
          divisionId: newBracket.divisionId,
          name: newBracket.name,
          format: newBracket.format,
          status: newBracket.status,
        },
        null,
        2
      )
    );
    process.exit(0);
  } catch (error) {
    console.error("\nFailed to create bracket:", error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Unexpected error:", error);
  process.exit(1);
});
