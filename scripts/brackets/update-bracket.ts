// Interactive script to update a bracket

import type { UpdateBracketInput } from "../../src/domain/contest/types.js";
import { createBracketRepository } from "../../src/infrastructure/repositories/index.js";
import { prompt } from "../prompt.js";

async function main() {
  console.log("Update an existing bracket\n");

  const bracketId = await prompt("Bracket ID");

  try {
    const bracketRepository = createBracketRepository();
    const bracket = await bracketRepository.getBracketById(bracketId);

    if (!bracket) {
      console.error("\nError: Bracket not found");
      process.exit(1);
    }

    console.log("\nCurrent bracket:");
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
    console.log("\nEnter new values (leave empty to keep current):\n");

    const newDivisionId = await prompt("Division ID", bracket.divisionId);
    const newName = await prompt("Name", bracket.name);
    const newFormatInput = await prompt("Format", bracket.format);
    const newFormat = newFormatInput as typeof bracket.format;
    const newStatus = await prompt("Status", bracket.status);

    const updates: UpdateBracketInput = {};
    if (newDivisionId !== bracket.divisionId) {
      updates.divisionId = newDivisionId;
    }
    if (newName !== bracket.name) {
      updates.name = newName;
    }
    if (newFormat !== bracket.format) {
      updates.format = newFormat;
    }
    if (newStatus !== bracket.status) {
      updates.status = newStatus;
    }

    if (Object.keys(updates).length === 0) {
      console.log("\nNo changes to apply.");
      process.exit(0);
    }

    const updatedBracket = await bracketRepository.updateBracket(bracketId, updates);

    console.log("\nBracket updated successfully!");
    console.log(
      JSON.stringify(
        {
          id: updatedBracket.id,
          divisionId: updatedBracket.divisionId,
          name: updatedBracket.name,
          format: updatedBracket.format,
          status: updatedBracket.status,
        },
        null,
        2
      )
    );
    process.exit(0);
  } catch (error) {
    console.error("\nFailed to update bracket:", error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Unexpected error:", error);
  process.exit(1);
});
