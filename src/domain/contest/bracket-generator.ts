// Bracket generation logic for single, double, and dingle elimination formats

export interface HeatStructure {
  heatId: string;
  riderIds: string[];
}

/**
 * Shuffles an array in place using Fisher-Yates algorithm
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Generates heat IDs for single elimination bracket
 * Pattern: 1a, 1b, 2a, 2b, ... up to final (e.g., 33)
 * Heats with same number (a/b) run in parallel
 */
function generateSingleEliminationHeatIds(participantCount: number): string[] {
  const heatIds: string[] = [];

  // Generate heat IDs following the pattern
  let heatNumber = 1;
  let heatsInRound = Math.ceil(participantCount / 2);

  while (heatsInRound > 0) {
    if (heatsInRound === 1) {
      // Final heat - no letter suffix
      heatIds.push(heatNumber.toString());
      break;
    } else {
      // Multiple heats in round - pair them with a/b suffixes
      for (let i = 0; i < heatsInRound; i += 2) {
        if (i + 1 < heatsInRound) {
          // Pair of heats - use a/b
          heatIds.push(`${heatNumber}a`);
          heatIds.push(`${heatNumber}b`);
          heatNumber++;
        } else {
          // Single heat (odd number in round) - no letter
          heatIds.push(heatNumber.toString());
          heatNumber++;
        }
      }
    }

    // Next round has half the heats (rounded up)
    heatsInRound = Math.ceil(heatsInRound / 2);
  }

  return heatIds;
}

/**
 * Generates a single elimination bracket structure
 * @param participantCount - Number of participants (determines bracket size)
 * @param participants - Optional list of participant rider IDs to distribute
 * @returns Array of heat structures with heat IDs and rider assignments
 */
export function generateSingleEliminationBracket(
  participantCount: number,
  participants?: string[]
): HeatStructure[] {
  const heatIds = generateSingleEliminationHeatIds(participantCount);
  const heats: HeatStructure[] = [];

  let participantIndex = 0;
  const shuffledParticipants = participants ? shuffleArray(participants) : [];

  // Calculate first round heats (where participants are initially assigned)
  const firstRoundHeats = Math.ceil(participantCount / 2);

  for (let i = 0; i < heatIds.length; i++) {
    const heatId = heatIds[i];
    const heatRiders: string[] = [];

    // Distribute participants sequentially to first round heats
    if (shuffledParticipants.length > 0 && i < firstRoundHeats) {
      // First round: assign 2 riders per heat
      if (participantIndex < shuffledParticipants.length) {
        heatRiders.push(shuffledParticipants[participantIndex++]);
      }
      if (participantIndex < shuffledParticipants.length) {
        heatRiders.push(shuffledParticipants[participantIndex++]);
      }
    }
    // Later rounds would be populated by winners from previous rounds (handled manually)

    heats.push({
      heatId,
      riderIds: heatRiders,
    });
  }

  return heats;
}

/**
 * Generates a double elimination bracket structure
 * Continues heat numbering from the single elimination final
 * @param singleEliminationFinalHeat - The heat number of the single elimination final
 * @param participantCount - Number of participants
 * @param participants - Optional list of participant rider IDs
 * @returns Array of heat structures for the loser bracket
 */
export function generateDoubleEliminationBracket(
  singleEliminationFinalHeat: number,
  participantCount: number,
  participants?: string[]
): HeatStructure[] {
  // Extract the numeric part from the final heat ID
  const finalHeatNumber = parseInt(singleEliminationFinalHeat.toString().replace(/[a-z]/i, ""), 10);
  const startHeatNumber = finalHeatNumber + 1;

  // Double elimination has a loser bracket structure
  // Simplified: generate heats continuing from single elimination
  // In reality, this would follow a specific double elimination bracket pattern
  const heats: HeatStructure[] = [];
  const loserBracketRounds = Math.ceil(Math.log2(participantCount));

  let currentHeatNumber = startHeatNumber;
  const shuffledParticipants = participants ? shuffleArray(participants) : [];
  let participantIndex = 0;

  // Generate loser bracket heats
  for (let round = 1; round <= loserBracketRounds; round++) {
    const heatsInRound = 2 ** (loserBracketRounds - round);

    for (let i = 0; i < heatsInRound; i++) {
      const heatRiders: string[] = [];

      // Assign participants if available (simplified - in reality losers from previous rounds)
      if (shuffledParticipants.length > 0 && participantIndex < shuffledParticipants.length) {
        if (participantIndex < shuffledParticipants.length) {
          heatRiders.push(shuffledParticipants[participantIndex++]);
        }
        if (participantIndex < shuffledParticipants.length) {
          heatRiders.push(shuffledParticipants[participantIndex++]);
        }
      }

      heats.push({
        heatId: currentHeatNumber.toString(),
        riderIds: heatRiders,
      });

      currentHeatNumber++;
    }
  }

  return heats;
}

/**
 * Generates a dingle elimination bracket structure
 * Similar to single elimination but with different progression rules
 * @param participantCount - Number of participants
 * @param participants - Optional list of participant rider IDs
 * @returns Array of heat structures
 */
export function generateDingleEliminationBracket(
  participantCount: number,
  participants?: string[]
): HeatStructure[] {
  // Dingle elimination is similar to single elimination
  // Using same structure for now - can be refined based on specific rules
  return generateSingleEliminationBracket(participantCount, participants);
}
