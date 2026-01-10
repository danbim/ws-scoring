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

    bracketId = await db.transaction(async (tx) => {
      const id = await createBracketWithHeats(tx);

      // Auto-complete bye heats and advance riders within the same transaction
      // Use a helper to recursively complete bye heats
      const completedHeats = new Set<string>();

      const completeByeHeat = async (heatId: string): Promise<void> => {
        if (completedHeats.has(heatId)) {
          return; // Already completed
        }

        await heatRepository.markCompleted(heatId, new Date(), tx);
        completedHeats.add(heatId);

        // Get the single rider in this bye heat
        const riderIds = await heatRepository.getHeatRiderIds(heatId, tx);
        if (riderIds.length !== 1) {
          return; // Not a bye heat
        }

        const riderId = riderIds[0];

        // Get metadata to find destination heat
        const metadata = await heatRepository.getHeatMetadata(heatId, tx);
        if (!metadata?.winnerDestinationHeatId) {
          return; // No destination (finals)
        }

        // Advance rider to next heat
        await heatRepository.addRiderToHeat(metadata.winnerDestinationHeatId, riderId, tx);
      };

      // Find and complete all initial bye heats
      for (const round of bracketStructure.rounds) {
        for (const heatSpec of round.heats) {
          if (heatSpec.riderIds.length === 1) {
            const heatId = `bracket-${id}-${heatSpec.position}`;
            await completeByeHeat(heatId);
          }
        }
      }

      return id;
    });
  } else {
    // For unit tests with mock repositories, skip transaction wrapper
    bracketId = await createBracketWithHeats();
  }

  return bracketId;
}
