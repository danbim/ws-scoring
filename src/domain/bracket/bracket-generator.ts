export interface BracketHeat {
  position: string;
  roundNumber: number;
  roundName: string;
  riderIds: string[];
  winnerDestinationPosition: string | null;
  loserDestinationPosition: string | null;
}

export interface BracketRound {
  roundNumber: number;
  roundName: string;
  heats: BracketHeat[];
}

export interface BracketStructure {
  rounds: BracketRound[];
  bracketSize: number;
  participantCount: number;
  byeCount: number;
  totalHeats: number;
}

export function generateSingleEliminationBracket(riderIds: string[]): BracketStructure {
  const participantCount = riderIds.length;

  // Validation
  if (participantCount < 2) {
    throw new Error("Single elimination bracket requires at least 2 riders");
  }
  if (participantCount > 64) {
    throw new Error("Single elimination bracket supports at most 64 riders");
  }

  // Special case: 2 riders = instant final
  if (participantCount === 2) {
    return {
      rounds: [
        {
          roundNumber: 1,
          roundName: "Final",
          heats: [
            {
              position: "1",
              roundNumber: 1,
              roundName: "Final",
              riderIds: [...riderIds],
              winnerDestinationPosition: null,
              loserDestinationPosition: null,
            },
          ],
        },
      ],
      bracketSize: 2,
      participantCount,
      byeCount: 0,
      totalHeats: 1,
    };
  }

  // Calculate bracket size (next power of 2)
  const bracketSize = nextPowerOf2(participantCount);
  const byeCount = bracketSize - participantCount;

  // Shuffle riders for random seeding
  const shuffledRiders = shuffle([...riderIds]);

  // Generate bracket structure
  const rounds = generateRounds(shuffledRiders, bracketSize, byeCount);
  const totalHeats = rounds.reduce((sum, round) => sum + round.heats.length, 0);

  return {
    rounds,
    bracketSize,
    participantCount,
    byeCount,
    totalHeats,
  };
}

function nextPowerOf2(n: number): number {
  return 2 ** Math.ceil(Math.log2(n));
}

function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function generateRounds(
  shuffledRiders: string[],
  bracketSize: number,
  _byeCount: number
): BracketRound[] {
  const rounds: BracketRound[] = [];
  let heatCounter = 1;

  // Create standard bracket pairings (1v8, 4v5, 2v7, 3v6 pattern)
  const seeds = Array.from({ length: bracketSize }, (_, i) => i + 1);
  const pairings = generateBracketPairings(seeds);

  // Generate Round 1 with rider assignments
  const round1Heats: BracketHeat[] = [];
  const heatsInRound1 = bracketSize / 2;

  for (let i = 0; i < heatsInRound1; i++) {
    const pairing = pairings[i];
    const position = i % 2 === 0 ? `${heatCounter}a` : `${heatCounter}b`;

    // Assign riders based on seeding (byes for top seeds)
    const riderIds: string[] = [];
    if (pairing[0] <= shuffledRiders.length) {
      riderIds.push(shuffledRiders[pairing[0] - 1]);
    }
    if (pairing[1] <= shuffledRiders.length) {
      riderIds.push(shuffledRiders[pairing[1] - 1]);
    }

    // Calculate the heat counter position for the next round
    // For round 1, the next round heats start after all round 1 heats
    const nextRoundBaseHeat = Math.ceil(heatsInRound1 / 2) + 1;
    const nextRoundHeatIndex = Math.floor(i / 2);
    const nextRoundHeatNumber = nextRoundBaseHeat + Math.floor(nextRoundHeatIndex / 2);
    const winnerDestinationPosition =
      nextRoundHeatIndex % 2 === 0 ? `${nextRoundHeatNumber}a` : `${nextRoundHeatNumber}b`;

    round1Heats.push({
      position,
      roundNumber: 1,
      roundName: "Round 1",
      riderIds,
      winnerDestinationPosition,
      loserDestinationPosition: null,
    });

    // Increment heat counter after processing pairs
    if (i % 2 === 1) {
      heatCounter++;
    }
  }

  rounds.push({
    roundNumber: 1,
    roundName: "Round 1",
    heats: round1Heats,
  });

  // Generate intermediate rounds (only if more than 4 riders in first round)
  let currentRoundSize = bracketSize / 2;
  let roundNumber = 2;

  while (currentRoundSize > 4) {
    const roundHeats: BracketHeat[] = [];
    const heatsInRound = currentRoundSize / 2;

    for (let i = 0; i < heatsInRound; i++) {
      const position = i % 2 === 0 ? `${heatCounter}a` : `${heatCounter}b`;

      // Calculate next round destination
      const nextRoundBaseHeat = heatCounter + Math.ceil(heatsInRound / 2);
      const nextRoundHeatIndex = Math.floor(i / 2);
      const nextRoundHeatNumber = nextRoundBaseHeat + Math.floor(nextRoundHeatIndex / 2);
      const winnerDestinationPosition =
        nextRoundHeatIndex % 2 === 0 ? `${nextRoundHeatNumber}a` : `${nextRoundHeatNumber}b`;

      roundHeats.push({
        position,
        roundNumber,
        roundName: `Round ${roundNumber}`,
        riderIds: [],
        winnerDestinationPosition,
        loserDestinationPosition: null,
      });

      if (i % 2 === 1) {
        heatCounter++;
      }
    }

    rounds.push({
      roundNumber,
      roundName: `Round ${roundNumber}`,
      heats: roundHeats,
    });

    heatCounter++;
    currentRoundSize /= 2;
    roundNumber++;
  }

  // Generate semi-finals (always 2 heats when we get to 4 riders remaining)
  const semiFinalHeats: BracketHeat[] = [
    {
      position: `${heatCounter}a`,
      roundNumber,
      roundName: "Semi-Finals",
      riderIds: [],
      winnerDestinationPosition: `${heatCounter + 2}`, // Final
      loserDestinationPosition: `${heatCounter + 1}`, // Runners-up final
    },
    {
      position: `${heatCounter}b`,
      roundNumber,
      roundName: "Semi-Finals",
      riderIds: [],
      winnerDestinationPosition: `${heatCounter + 2}`,
      loserDestinationPosition: `${heatCounter + 1}`,
    },
  ];

  rounds.push({
    roundNumber,
    roundName: "Semi-Finals",
    heats: semiFinalHeats,
  });

  heatCounter++;
  roundNumber++;

  // Runners-up final
  rounds.push({
    roundNumber,
    roundName: "Runners-Up Final",
    heats: [
      {
        position: `${heatCounter}`,
        roundNumber,
        roundName: "Runners-Up Final",
        riderIds: [],
        winnerDestinationPosition: null,
        loserDestinationPosition: null,
      },
    ],
  });

  heatCounter++;
  roundNumber++;

  // Final
  rounds.push({
    roundNumber,
    roundName: "Final",
    heats: [
      {
        position: `${heatCounter}`,
        roundNumber,
        roundName: "Final",
        riderIds: [],
        winnerDestinationPosition: null,
        loserDestinationPosition: null,
      },
    ],
  });

  return rounds;
}

function generateBracketPairings(seeds: number[]): [number, number][] {
  if (seeds.length === 2) {
    return [[seeds[0], seeds[1]]];
  }

  const n = seeds.length;
  const pairings: [number, number][] = [];

  // Standard bracket pairing: 1v8, 4v5, 2v7, 3v6 for 8-rider
  // Pattern: 1vN, (N/2)v(N/2+1), 2v(N-1), (N/2-1)v(N/2+2), etc.
  for (let i = 0; i < n / 2; i++) {
    const top = i < n / 2 ? i + 1 : i + 1 - n / 2;
    const bottom = n - i;
    pairings.push([top, bottom]);
  }

  return pairings;
}
