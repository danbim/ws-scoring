// Script to list all brackets

import { createBracketRepository } from "../../src/infrastructure/repositories/index.js";

async function main() {
  try {
    const bracketRepository = createBracketRepository();

    const allBrackets = await bracketRepository.getAllBrackets();

    console.log(`\nFound ${allBrackets.length} bracket(s):\n`);

    if (allBrackets.length === 0) {
      console.log("No brackets found.");
    } else {
      for (const bracket of allBrackets) {
        console.log(
          JSON.stringify(
            {
              id: bracket.id,
              divisionId: bracket.divisionId,
              name: bracket.name,
              format: bracket.format,
              status: bracket.status,
              createdAt: bracket.createdAt,
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
    console.error("\nFailed to list brackets:", error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Unexpected error:", error);
  process.exit(1);
});
