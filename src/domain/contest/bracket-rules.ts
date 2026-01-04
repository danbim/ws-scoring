// Validation rules for bracket creation within divisions

import type { BracketRepository } from "./repositories.js";
import type { BracketFormat } from "./types.js";

export class InvalidBracketCombinationError extends Error {}

/**
 * Validates that a new bracket format can be created in a division
 * Rules:
 * - A division can have EITHER (single elimination + optional double elimination) OR (dingle elimination)
 * - Cannot mix single/double with dingle
 */
export async function validateDivisionBracketRules(
  divisionId: string,
  newFormat: BracketFormat,
  bracketRepository: BracketRepository
): Promise<void> {
  const existingBrackets = await bracketRepository.getBracketsByDivisionId(divisionId);

  // Rule: Double elimination can only be created if single elimination exists
  // This rule applies even when there are no existing brackets
  if (newFormat === "double_elimination") {
    const hasSingle = existingBrackets.some((b) => b.format === "single_elimination");
    if (!hasSingle) {
      throw new InvalidBracketCombinationError(
        "Cannot create double elimination bracket without a single elimination bracket in the division"
      );
    }
  }

  // Check if there are any existing brackets
  if (existingBrackets.length === 0) {
    // No existing brackets, any format is allowed (except double elimination, which is checked above)
    return;
  }

  // Check existing bracket formats
  const hasSingle = existingBrackets.some((b) => b.format === "single_elimination");
  const hasDouble = existingBrackets.some((b) => b.format === "double_elimination");
  const hasDingle = existingBrackets.some((b) => b.format === "dingle");

  // Rule: Cannot mix single/double with dingle
  if (hasDingle && (newFormat === "single_elimination" || newFormat === "double_elimination")) {
    throw new InvalidBracketCombinationError(
      "Cannot create single or double elimination bracket in a division that already has a dingle elimination bracket"
    );
  }

  if ((hasSingle || hasDouble) && newFormat === "dingle") {
    throw new InvalidBracketCombinationError(
      "Cannot create dingle elimination bracket in a division that already has single or double elimination brackets"
    );
  }
}
