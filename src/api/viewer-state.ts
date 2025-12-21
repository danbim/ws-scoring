// Viewer state builder - combines score calculations and rider metadata resolution
import { calculateRiderScoreTotals, type HeatState } from "../domain/heat/index.js";
import type { HeatViewerState, RiderViewerData } from "./types.js";

// Rider metadata mapping (mock/placeholder implementation)
interface RiderInfo {
  country: string;
  sailNumber: string;
  lastName: string;
}

// Mock data mapping - in a real system, this would come from an API
const mockRiderData: Record<string, RiderInfo> = {
  "K-90": { country: "GB", sailNumber: "K-90", lastName: "Meldrum" },
  "I-676": { country: "IT", sailNumber: "I-676", lastName: "Morislo" },
  "E-255": { country: "ES", sailNumber: "E-255", lastName: "Friedi Morales" },
  "SBH-8": { country: "", sailNumber: "SBH-8", lastName: "Beauvarlet" },
};

function getRiderInfo(riderId: string): RiderInfo {
  // Check if we have mock data for this rider
  if (mockRiderData[riderId]) {
    return mockRiderData[riderId];
  }

  // Try to parse riderId patterns
  const countryMap: Record<string, string> = {
    K: "GB", // UK
    I: "IT", // Italy
    E: "ES", // Spain
    SBH: "", // Unknown
  };

  // Try to extract country code from prefix
  const parts = riderId.split("-");
  const prefix = parts[0];
  const country = countryMap[prefix] || "";

  return {
    country,
    sailNumber: riderId,
    lastName: riderId, // Fallback to riderId as name
  };
}

/**
 * Builds a {@link HeatViewerState} from a domain-level {@link HeatState}.
 *
 * The function:
 * - Uses {@link calculateRiderScoreTotals} to compute per-rider wave, jump, and combined totals
 *   from the raw heat scoring information.
 * - Resolves basic rider metadata (country, sail number, display name) via {@link getRiderInfo}
 *   using the rider identifier from the scoring data.
 * - Produces a list of {@link RiderViewerData} entries ordered by their position in the rankings
 *   (1-based index derived from the order of the calculated totals).
 *
 * The resulting structure is tailored for UI/viewer consumption and is expected to be stable
 * enough to use directly in rendering layers.
 *
 * @param heatState - The current state of the heat, including heat identifier and all scoring
 *   information required to calculate rider totals.
 * @returns A {@link HeatViewerState} containing the heat identifier and a list of enriched,
 *   display-ready rider entries derived from the provided {@link HeatState}.
 */
export function buildHeatViewerState(heatState: HeatState): HeatViewerState {
  const riderTotals = calculateRiderScoreTotals(heatState);

  const riders: RiderViewerData[] = riderTotals.map((rider, index) => {
    const riderInfo = getRiderInfo(rider.riderId);

    return {
      riderId: rider.riderId,
      position: index + 1, // 1-based position
      country: riderInfo.country,
      sailNumber: riderInfo.sailNumber,
      lastName: riderInfo.lastName,
      waveTotal: rider.waveTotal,
      jumpTotal: rider.jumpTotal,
      total: rider.total,
    };
  });

  return {
    heatId: heatState.heatId,
    riders,
  };
}
