import type { DbTransaction } from "../../infrastructure/db/index.js";
import type { BracketRepository, DivisionRepository } from "../contest/repositories.js";
import type { HeatRepository } from "../heat/repositories.js";
import type { DivisionParticipantRepository } from "../rider/repositories.js";
import { generateSingleEliminationBracket } from "./bracket-generator.js";

export class BracketAlreadyExistsError extends Error {
  constructor(divisionId: string) {
    super(`Bracket already exists for division ${divisionId}`);
  }
}

export class DivisionNotFoundError extends Error {
  constructor(divisionId: string) {
    super(`Division ${divisionId} not found`);
  }
}

export class InsufficientParticipantsError extends Error {
  constructor(count: number) {
    super(`Division has ${count} participants, need at least 2`);
  }
}

export async function generateBracketForDivision(
  divisionId: string,
  repositories: {
    divisionRepository: DivisionRepository;
    bracketRepository: BracketRepository;
    divisionParticipantRepository: DivisionParticipantRepository;
    heatRepository: HeatRepository;
  },
  options?: {
    useTransaction?: boolean; // Default: true
  }
): Promise<string> {
  const { divisionRepository, bracketRepository, divisionParticipantRepository, heatRepository } =
    repositories;
  const useTransaction = options?.useTransaction ?? true;

  // Validate division exists
  const division = await divisionRepository.getDivisionById(divisionId);
  if (!division) {
    throw new DivisionNotFoundError(divisionId);
  }

  // Check if bracket already exists
  const existingBracket = await bracketRepository.getBracketByDivisionId(divisionId);
  if (existingBracket) {
    throw new BracketAlreadyExistsError(divisionId);
  }

  // Get participants
  const riderIds = await divisionParticipantRepository.getRiderIdsByDivisionId(divisionId);
  if (riderIds.length < 2) {
    throw new InsufficientParticipantsError(riderIds.length);
  }

  if (riderIds.length > 64) {
    throw new Error(`Division has ${riderIds.length} participants, maximum is 64`);
  }

  // Generate bracket structure
  const bracketStructure = generateSingleEliminationBracket(riderIds);

  // Define the bracket creation logic
  const createBracketWithHeats = async (tx?: DbTransaction) => {
    // Create bracket record within transaction
    const bracket = await bracketRepository.createBracket(
      {
        divisionId,
        name: "Single Elimination",
        format: "single_elimination",
        status: "in_progress",
      },
      tx
    );

    // Create all heats in reverse order (finals first) so that foreign key constraints are satisfied
    // when referencing winnerDestinationHeatId and loserDestinationHeatId
    for (const round of bracketStructure.rounds.slice().reverse()) {
      for (const heatSpec of round.heats) {
        const heatId = `bracket-${bracket.id}-${heatSpec.position}`;

        // Find destination heat IDs
        let winnerDestinationHeatId: string | null = null;
        let loserDestinationHeatId: string | null = null;

        if (heatSpec.winnerDestinationPosition) {
          winnerDestinationHeatId = `bracket-${bracket.id}-${heatSpec.winnerDestinationPosition}`;
        }
        if (heatSpec.loserDestinationPosition) {
          loserDestinationHeatId = `bracket-${bracket.id}-${heatSpec.loserDestinationPosition}`;
        }

        // Create heat in relational DB with bracket metadata within transaction
        await heatRepository.createHeatWithBracketMetadata(
          {
            heatId,
            bracketId: bracket.id,
            riderIds: heatSpec.riderIds,
            wavesCounting: 2, // Default rules
            jumpsCounting: 2,
            roundNumber: heatSpec.roundNumber,
            roundName: heatSpec.roundName,
            position: heatSpec.position,
            winnerDestinationHeatId,
            loserDestinationHeatId,
          },
          tx
        );
      }
    }

    return bracket.id;
  };

  // Execute with or without transaction based on option
  let bracketId: string;
  if (useTransaction) {
    const { getDb } = await import("../../infrastructure/db/index.js");
    const db = await getDb();

    try {
      bracketId = await db.transaction(createBracketWithHeats);
    } catch (error) {
      // Transaction will automatically rollback on error
      // Re-throw with additional context while preserving original error
      const message = `Failed to create bracket: ${error instanceof Error ? error.message : String(error)}`;
      if (error instanceof Error) {
        error.message = message;
        throw error;
      }
      throw new Error(message);
    }
  } else {
    // For unit tests with mock repositories, skip transaction wrapper
    bracketId = await createBracketWithHeats();
  }

  // After successful DB transaction, handle event store operations
  // These are done outside the transaction as they use a separate system
  try {
    for (const round of bracketStructure.rounds.slice().reverse()) {
      for (const heatSpec of round.heats) {
        const heatId = `bracket-${bracketId}-${heatSpec.position}`;

        // Only create heat in event store for first round (with actual riders)
        // Later rounds will be created when riders advance to them
        if (heatSpec.roundNumber === 1) {
          const { handleCommand } = await import("../../api/helpers.js");
          await handleCommand({
            type: "CreateHeat",
            data: {
              heatId,
              riderIds: heatSpec.riderIds,
              heatRules: { wavesCounting: 2, jumpsCounting: 2 },
              bracketId,
            },
          });
        }

        // If heat is a bye (1 rider), immediately complete it
        if (heatSpec.riderIds.length === 1) {
          // Add a nominal score for the bye rider (required for heat completion)
          const { handleCommand } = await import("../../api/helpers.js");
          const { v4: uuidv4 } = await import("uuid");
          await handleCommand({
            type: "AddWaveScore",
            data: {
              heatId,
              scoreUUID: uuidv4(),
              riderId: heatSpec.riderIds[0],
              waveScore: 0,
              timestamp: new Date(),
            },
          });

          // Now complete the bye heat
          await heatRepository.completeHeat(heatId, new Date());
        }
      }
    }
  } catch (error) {
    // If event store operations fail after DB commit, we have a consistency issue
    // TODO: Replace console.error with proper logging framework when available
    console.error("Event store operation failed after DB commit:", error);
    // Attempt cleanup by deleting the bracket
    try {
      await bracketRepository.deleteBracket(bracketId);
    } catch (cleanupError) {
      // TODO: Replace console.error with proper logging framework when available
      console.error("Failed to cleanup bracket after event store error:", cleanupError);
    }
    // Re-throw with additional context while preserving original error
    const message = `Bracket created in database but event store operations failed: ${
      error instanceof Error ? error.message : String(error)
    }`;
    if (error instanceof Error) {
      error.message = message;
      throw error;
    }
    throw new Error(message);
  }

  return bracketId;
}
