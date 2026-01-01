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
      bracketId: options?.bracketId ?? "00000000-0000-0000-0000-000000000000",
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
