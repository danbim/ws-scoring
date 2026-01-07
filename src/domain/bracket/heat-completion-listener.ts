import { aggregateHeatState } from "../../api/helpers.js";
import type { HeatRepository } from "../heat/repositories.js";
import { calculateRiderScoreTotals } from "../heat/score-calculator.js";

/**
 * Handles heat completion and triggers bracket progression.
 * This is the core of automatic bracket advancement.
 *
 * @param heatId - The ID of the completed heat
 * @param heatRepository - Repository for heat operations
 * @param getHeatMetadata - Function to retrieve heat metadata (destinations)
 */
export async function handleHeatCompleted(
  heatId: string,
  heatRepository: HeatRepository,
  getHeatMetadata: (heatId: string) => Promise<{
    winnerDestinationHeatId: string | null;
    loserDestinationHeatId: string | null;
  } | null>
): Promise<void> {
  // Get heat metadata (winner/loser destinations)
  const metadata = await getHeatMetadata(heatId);
  if (!metadata) {
    // No metadata means this is likely the finals or a standalone heat
    return;
  }

  // Reconstruct heat state from event store
  const heatState = await aggregateHeatState(heatId);
  if (!heatState) {
    throw new Error(`Heat ${heatId} does not exist in event store`);
  }

  // Calculate winner and loser using score calculator
  // For bye heats (1 rider, 0 scores), the rider will have a total of 0 but still advances
  const scoreTotals = calculateRiderScoreTotals(heatState);

  if (scoreTotals.length === 0) {
    // No riders in heat, nothing to advance
    return;
  }

  // Winner is first (highest score), loser is second
  // For bye heats with 1 rider, loser will be null
  const winner = scoreTotals[0];
  const loser = scoreTotals.length > 1 ? scoreTotals[1] : null;

  // Advance winner to winner destination heat
  if (metadata.winnerDestinationHeatId) {
    await addRiderToHeat(metadata.winnerDestinationHeatId, winner.riderId, heatRepository);
  }

  // Advance loser to loser destination heat (if exists, for double elimination)
  if (loser && metadata.loserDestinationHeatId) {
    await addRiderToHeat(metadata.loserDestinationHeatId, loser.riderId, heatRepository);
  }
}

/**
 * Adds a rider to a heat and checks if it becomes a bye heat.
 * If the heat now has exactly 1 rider, it's a bye and should auto-complete.
 *
 * @param heatId - The heat to add the rider to
 * @param riderId - The rider to add
 * @param heatRepository - Repository for heat operations
 */
async function addRiderToHeat(
  heatId: string,
  riderId: string,
  heatRepository: HeatRepository
): Promise<void> {
  // Get heat info from relational DB
  const heat = await heatRepository.getHeatByHeatId(heatId);
  if (!heat) {
    throw new Error(`Heat ${heatId} not found`);
  }

  // Check if heat exists in event store
  const { aggregateHeatState } = await import("../../api/helpers.js");
  const heatState = await aggregateHeatState(heatId);

  // If heat doesn't exist in event store, create it with the advancing rider
  if (!heatState) {
    // Heat exists in relational DB but not in event store yet
    // This happens for later rounds that haven't been activated yet

    const { handleCommand } = await import("../../api/helpers.js");
    await handleCommand({
      type: "CreateHeat",
      data: {
        heatId,
        riderIds: [riderId],
        heatRules: { wavesCounting: heat.wavesCounting, jumpsCounting: heat.jumpsCounting },
        bracketId: heat.bracketId,
        position: heat.position,
        roundNumber: heat.roundNumber,
        roundName: heat.roundName,
      },
    });
  } else {
    // Heat exists in event store, but we can't add riders after creation
    // This shouldn't happen with our new design (only first round heats are created in event store)
    // For now, we'll just add the rider to the relational DB
  }

  // Add rider to heat in relational DB
  await heatRepository.addRiderToHeat(heatId, riderId);

  // Check if heat now has exactly 1 rider (bye)
  const riderIds = await heatRepository.getHeatRiderIds(heatId);

  if (riderIds.length === 1) {
    // This is a bye heat - auto-complete it without scores
    // The domain logic allows heat completion without scores (rider advances automatically)
    await heatRepository.completeHeat(heatId, new Date());
  }
}
