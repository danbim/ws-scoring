import {
  createBracketRepository,
  createContestRepository,
  createDivisionRepository,
  createSeasonRepository,
} from "../../src/infrastructure/repositories/index.js";

const apiBaseUrl = "http://localhost/api/";
const apiHeatsUrl = `${apiBaseUrl}/heats`;
const apiHeatUrl = (heatId: string) => `${apiHeatsUrl}/${heatId}`;
const apiWaveScoreUrl = (heatId: string) => `${apiHeatUrl(heatId)}/scores/wave`;
const apiJumpScoreUrl = (heatId: string) => `${apiHeatUrl(heatId)}/scores/jump`;

// Rider ID constants
const RIDER_1 = "rider-1";
const RIDER_2 = "rider-2";
const RIDER_IDS = {
  RIDER_1,
  RIDER_2,
} as const;

// Default heat rules
const DEFAULT_HEAT_RULES = {
  wavesCounting: 2,
  jumpsCounting: 1,
} as const;

// Common request headers
const JSON_HEADERS = {
  "Content-Type": "application/json",
} as const;

// Test bracket ID - will be created in setup
let TEST_BRACKET_ID: string | null = null;

// Setup function to create test data (season, contest, division, bracket)
export async function setupTestData(): Promise<string> {
  if (TEST_BRACKET_ID) {
    return TEST_BRACKET_ID;
  }

  const seasonRepository = createSeasonRepository();
  const contestRepository = createContestRepository();
  const divisionRepository = createDivisionRepository();
  const bracketRepository = createBracketRepository();

  // Create season
  const season = await seasonRepository.createSeason({
    name: "Test Season",
    year: 2024,
    startDate: new Date("2024-01-01"),
    endDate: new Date("2024-12-31"),
  });

  // Create contest
  const contest = await contestRepository.createContest({
    seasonId: season.id,
    name: "Test Contest",
    location: "Test Location",
    startDate: new Date("2024-06-01"),
    endDate: new Date("2024-06-07"),
    status: "draft",
  });

  // Create division
  const division = await divisionRepository.createDivision({
    contestId: contest.id,
    name: "Test Division",
    category: "pro_men",
  });

  // Create bracket
  const bracket = await bracketRepository.createBracket({
    divisionId: division.id,
    name: "Test Bracket",
    format: "single_elimination",
    status: "draft",
  });

  TEST_BRACKET_ID = bracket.id;
  return TEST_BRACKET_ID;
}

// Helper function to create a heat request
function createHeatRequest(
  heatId: string,
  options?: {
    riderIds?: string[];
    heatRules?: { wavesCounting: number; jumpsCounting: number };
    bracketId?: string;
  }
): Request {
  return new Request(apiHeatsUrl, {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({
      heatId,
      riderIds: options?.riderIds ?? [RIDER_1],
      heatRules: options?.heatRules ?? DEFAULT_HEAT_RULES,
      bracketId: options?.bracketId ?? TEST_BRACKET_ID ?? "00000000-0000-0000-0000-000000000000",
    }),
  });
}

// Helper function to create a wave score request
function createWaveScoreRequest(
  heatId: string,
  options: {
    scoreUUID: string;
    riderId: string;
    waveScore: number;
  }
): Request {
  return new Request(apiWaveScoreUrl(heatId), {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({
      heatId,
      scoreUUID: options.scoreUUID,
      riderId: options.riderId,
      waveScore: options.waveScore,
    }),
  });
}

// Helper function to create a jump score request
function createJumpScoreRequest(
  heatId: string,
  options: {
    scoreUUID: string;
    riderId: string;
    jumpScore: number;
    jumpType: string;
  }
): Request {
  return new Request(apiJumpScoreUrl(heatId), {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({
      heatId,
      scoreUUID: options.scoreUUID,
      riderId: options.riderId,
      jumpScore: options.jumpScore,
      jumpType: options.jumpType,
    }),
  });
}

export {
  apiBaseUrl,
  apiHeatsUrl,
  apiHeatUrl,
  apiWaveScoreUrl,
  apiJumpScoreUrl,
  RIDER_IDS,
  RIDER_1,
  RIDER_2,
  DEFAULT_HEAT_RULES,
  JSON_HEADERS,
  createHeatRequest,
  createWaveScoreRequest,
  createJumpScoreRequest,
};
