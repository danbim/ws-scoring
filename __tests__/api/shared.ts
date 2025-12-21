const apiBaseUrl = "http://localhost/api/";
const apiHeatsUrl = `${apiBaseUrl}/heats`;
const apiHeatUrl = (heatId: string) => `${apiHeatsUrl}/${heatId}`;
const apiWaveScoreUrl = (heatId: string) => `${apiHeatUrl(heatId)}/scores/wave`;
const apiJumpScoreUrl = (heatId: string) => `${apiHeatUrl(heatId)}/scores/jump`;

export { apiBaseUrl, apiHeatsUrl, apiHeatUrl, apiWaveScoreUrl, apiJumpScoreUrl };
