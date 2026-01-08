const apiBaseUrl = "http://localhost/api/";
const apiHeatsUrl = `${apiBaseUrl}/heats`;
const apiHeatUrl = (heatId: string) => `${apiHeatsUrl}/${heatId}`;
const apiWaveScoreUrl = (heatId: string) => `${apiHeatUrl(heatId)}/scores/wave`;
const apiJumpScoreUrl = (heatId: string) => `${apiHeatUrl(heatId)}/scores/jump`;

// Rider ID constants (must match UUIDs in heat-routes.test.ts setup)
const RIDER_1 = "00000000-0000-0000-0000-000000000011";
const RIDER_2 = "00000000-0000-0000-0000-000000000012";
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

// Re-export test utilities for convenience
export { DEFAULT_TEST_BRACKET_ID } from "../test-utils.js";

// Helper function to create a heat request
// Note: bracketId is required as all heats must belong to a bracket
function createHeatRequest(
  heatId: string,
  options: {
    riderIds?: string[];
    heatRules?: { wavesCounting: number; jumpsCounting: number };
    bracketId: string;
    position?: string;
    roundNumber?: number;
    roundName?: string;
  }
): Request {
  return new Request(apiHeatsUrl, {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({
      heatId,
      riderIds: options.riderIds ?? [RIDER_1],
      heatRules: options.heatRules ?? DEFAULT_HEAT_RULES,
      bracketId: options.bracketId,
      position: options.position ?? heatId,
      roundNumber: options.roundNumber ?? 1,
      roundName: options.roundName ?? "Round 1",
    }),
  });
}

// Mock user ID for tests (must match UUID in heat-routes.test.ts setup)
const DEFAULT_TEST_JUDGE_ID = "00000000-0000-0000-0000-000000000020";

// Helper function to create a wave score request
function createWaveScoreRequest(
  heatId: string,
  options: {
    scoreUUID: string;
    riderId: string;
    waveScore: number;
    judgeId?: string;
  }
): Request & { user: { id: string } } {
  const request = new Request(apiWaveScoreUrl(heatId), {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({
      heatId,
      scoreUUID: options.scoreUUID,
      riderId: options.riderId,
      waveScore: options.waveScore,
    }),
  });
  // Add mock user object for authentication
  (request as Request & { user: { id: string } }).user = {
    id: options.judgeId ?? DEFAULT_TEST_JUDGE_ID,
  };
  return request as Request & { user: { id: string } };
}

// Helper function to create a jump score request
function createJumpScoreRequest(
  heatId: string,
  options: {
    scoreUUID: string;
    riderId: string;
    jumpScore: number;
    jumpType: string;
    modifiers?: string[];
    judgeId?: string;
  }
): Request & { user: { id: string } } {
  const request = new Request(apiJumpScoreUrl(heatId), {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({
      heatId,
      scoreUUID: options.scoreUUID,
      riderId: options.riderId,
      jumpScore: options.jumpScore,
      jumpType: options.jumpType,
      modifiers: options.modifiers ?? [],
    }),
  });
  // Add mock user object for authentication
  (request as Request & { user: { id: string } }).user = {
    id: options.judgeId ?? DEFAULT_TEST_JUDGE_ID,
  };
  return request as Request & { user: { id: string } };
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
  DEFAULT_TEST_JUDGE_ID,
  createHeatRequest,
  createWaveScoreRequest,
  createJumpScoreRequest,
};
