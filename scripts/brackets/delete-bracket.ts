// Interactive script to delete a bracket

import { createBracketRepository } from "../../src/infrastructure/repositories/index.js";
import { prompt } from "../prompt.js";

async function main() {
  console.log("Delete a bracket\n");

  const bracketId = await prompt("Bracket ID");

  try {
    const bracketRepository = createBracketRepository();
    const bracket = await bracketRepository.getBracketById(bracketId);

    if (!bracket) {
      console.error("\nError: Bracket not found");
      process.exit(1);
    }

    console.log("\nBracket to delete:");
    console.log(
      JSON.stringify(
        {
          id: bracket.id,
          divisionId: bracket.divisionId,
          name: bracket.name,
          format: bracket.format,
          status: bracket.status,
        },
        null,
        2
      )
    );

    const confirm = await prompt("\nAre you sure you want to delete this bracket? (yes/no)", "no");

    if (confirm.toLowerCase() !== "yes") {
      console.log("\nDeletion cancelled.");
      process.exit(0);
    }

    await bracketRepository.deleteBracket(bracketId);

    console.log("\nBracket deleted successfully!");
    process.exit(0);
  } catch (error) {
    console.error("\nFailed to delete bracket:", error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Unexpected error:", error);
  process.exit(1);
});
