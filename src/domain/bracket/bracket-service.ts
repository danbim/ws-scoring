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
  }
): Promise<string> {
  const { divisionRepository, bracketRepository, divisionParticipantRepository, heatRepository } =
    repositories;

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

  // Create bracket record
  const bracket = await bracketRepository.createBracket({
    divisionId,
    name: "Single Elimination",
    format: "single_elimination",
    status: "in_progress",
  });

  // Create all heats
  for (const round of bracketStructure.rounds) {
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

      // Create heat in relational DB with bracket metadata
      await heatRepository.createHeatWithBracketMetadata({
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
      });

      // Emit HeatCreated event via event store
      const { handleCommand } = await import("../../api/helpers.js");
      await handleCommand({
        type: "CreateHeat",
        data: {
          heatId,
          riderIds: heatSpec.riderIds,
          heatRules: { wavesCounting: 2, jumpsCounting: 2 },
          bracketId: bracket.id,
        },
      });

      // If heat is a bye (1 rider), immediately complete it
      if (heatSpec.riderIds.length === 1) {
        await heatRepository.completeHeat(heatId, new Date());
      }
    }
  }

  return bracket.id;
}
