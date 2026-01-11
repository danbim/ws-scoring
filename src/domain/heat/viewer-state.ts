// Viewer state builder - combines score calculations and rider metadata resolution
import type { RiderRepository } from "../rider/repositories.js";
import { calculateRiderScoreTotals } from "./score-calculator.js";
import type { HeatState } from "./types.js";

// Viewer state types - pre-computed data for display
export interface RiderViewerData {
  riderId: string;
  position: number; // 1-based rank
  country: string;
  sailNumber: string;
  firstName: string;
  lastName: string;
  waveTotal: number;
  jumpTotal: number;
  total: number;
}

export interface HeatViewerState {
  heatId: string;
  position: string;
  riders: RiderViewerData[]; // Sorted by total score (descending)
}

/**
 * Builds a {@link HeatViewerState} from a domain-level {@link HeatState}.
 *
 * The function:
 * - Uses {@link calculateRiderScoreTotals} to compute per-rider wave, jump, and combined totals
 *   from the raw heat scoring information.
 * - Resolves rider metadata (country, sail number, display name) via the provided {@link RiderRepository}.
 * - Produces a list of {@link RiderViewerData} entries ordered by their position in the rankings
 *   (1-based index derived from the order of the calculated totals).
 *
 * The resulting structure is tailored for UI/viewer consumption and is expected to be stable
 * enough to use directly in rendering layers.
 *
 * @param heatState - The current state of the heat, including heat identifier and all scoring
 *   information required to calculate rider totals.
 * @param riderRepository - Repository to fetch rider details.
 * @returns A promise resolving to a {@link HeatViewerState} containing the heat identifier and a list of enriched,
 *   display-ready rider entries derived from the provided {@link HeatState}.
 */
export async function buildHeatViewerState(
  heatState: HeatState,
  riderRepository: RiderRepository
): Promise<HeatViewerState> {
  const riderTotals = calculateRiderScoreTotals(heatState);

  // Fetch all riders in parallel
  const riderPromises = riderTotals.map(async (rider, index) => {
    const riderInfo = await riderRepository.getRiderById(rider.riderId);

    // Fallback if rider not found or missing fields
    const country = riderInfo?.country || "";
    const sailNumber = riderInfo?.sailNumber || "";
    const firstName = riderInfo?.firstName || "";
    const lastName = riderInfo?.lastName || "Unknown Rider";

    return {
      riderId: rider.riderId,
      position: index + 1, // 1-based position
      country,
      sailNumber,
      firstName,
      lastName,
      waveTotal: rider.waveTotal,
      jumpTotal: rider.jumpTotal,
      total: rider.total,
    } as RiderViewerData;
  });

  const riders = await Promise.all(riderPromises);

  return {
    heatId: heatState.heatId,
    position: heatState.position,
    riders,
  };
}
