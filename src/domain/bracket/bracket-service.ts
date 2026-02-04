import type { BracketRepository, DivisionRepository } from "../contest/repositories.js";
import { HeatDoesNotExistError } from "../heat/errors.js";
import type { HeatRepository } from "../heat/repositories.js";
import { err, ok, type Result } from "../result.js";
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

export class TooManyParticipantsError extends Error {
  constructor(count: number) {
    super(`Division has ${count} participants, maximum is 64`);
  }
}

export type BracketServiceError =
  | BracketAlreadyExistsError
  | DivisionNotFoundError
  | InsufficientParticipantsError
  | TooManyParticipantsError
  | HeatDoesNotExistError;

export async function generateBracketForDivision(
  divisionId: string,
  repositories: {
    divisionRepository: DivisionRepository;
    bracketRepository: BracketRepository;
    divisionParticipantRepository: DivisionParticipantRepository;
    heatRepository: HeatRepository;
  }
): Promise<Result<string, BracketServiceError>> {
  const { divisionRepository, bracketRepository, divisionParticipantRepository, heatRepository } =
    repositories;

  // Validate division exists
  const division = await divisionRepository.getDivisionById(divisionId);
  if (!division) {
    return err(new DivisionNotFoundError(divisionId));
  }

  // Check if bracket already exists
  const existingBracket = await bracketRepository.getBracketByDivisionId(divisionId);
  if (existingBracket) {
    return err(new BracketAlreadyExistsError(divisionId));
  }

  // Get participants
  const riderIds = await divisionParticipantRepository.getRiderIdsByDivisionId(divisionId);
  if (riderIds.length < 2) {
    return err(new InsufficientParticipantsError(riderIds.length));
  }

  if (riderIds.length > 64) {
    return err(new TooManyParticipantsError(riderIds.length));
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

  // Create all heats in reverse order (finals first) so that foreign key constraints are satisfied
  for (const round of bracketStructure.rounds.slice().reverse()) {
    for (const heatSpec of round.heats) {
      const heatId = `bracket-${bracket.id}-${heatSpec.position}`;

      let winnerDestinationHeatId: string | null = null;
      let loserDestinationHeatId: string | null = null;

      if (heatSpec.winnerDestinationPosition) {
        winnerDestinationHeatId = `bracket-${bracket.id}-${heatSpec.winnerDestinationPosition}`;
      }
      if (heatSpec.loserDestinationPosition) {
        loserDestinationHeatId = `bracket-${bracket.id}-${heatSpec.loserDestinationPosition}`;
      }

      await heatRepository.createHeatWithBracketMetadata({
        heatId,
        bracketId: bracket.id,
        riderIds: heatSpec.riderIds,
        wavesCounting: 2,
        jumpsCounting: 2,
        roundNumber: heatSpec.roundNumber,
        roundName: heatSpec.roundName,
        position: heatSpec.position,
        winnerDestinationHeatId,
        loserDestinationHeatId,
      });
    }
  }

  // Auto-complete bye heats and advance riders
  const completedHeats = new Set<string>();

  const completeByeHeat = async (heatId: string): Promise<Result<void, HeatDoesNotExistError>> => {
    if (completedHeats.has(heatId)) {
      return ok(undefined);
    }

    await heatRepository.markCompleted(heatId, new Date());
    completedHeats.add(heatId);

    const heatRiderIds = await heatRepository.getHeatRiderIds(heatId);
    if (heatRiderIds.length !== 1) {
      return ok(undefined);
    }

    const riderId = heatRiderIds[0];
    const metadata = await heatRepository.getHeatMetadata(heatId);
    if (!metadata?.winnerDestinationHeatId) {
      return ok(undefined);
    }

    // Validate that destination heat exists before adding rider
    const destinationHeatExists = await heatRepository.getHeatByHeatId(
      metadata.winnerDestinationHeatId
    );
    if (!destinationHeatExists) {
      return err(new HeatDoesNotExistError(metadata.winnerDestinationHeatId));
    }

    await heatRepository.addRiderToHeat(metadata.winnerDestinationHeatId, riderId);
    return ok(undefined);
  };

  for (const round of bracketStructure.rounds) {
    for (const heatSpec of round.heats) {
      if (heatSpec.riderIds.length === 1) {
        const heatId = `bracket-${bracket.id}-${heatSpec.position}`;
        const result = await completeByeHeat(heatId);
        if (result.isErr()) {
          return err(result.error);
        }
      }
    }
  }

  return ok(bracket.id);
}
