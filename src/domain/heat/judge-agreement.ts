import type { Score } from "./types";

export interface Discrepancy {
  type: "wave_count" | "jump_catalog";
  riderId: string;
  details: Record<string, unknown>;
}

export interface AgreementValidationResult {
  hasDiscrepancies: boolean;
  discrepancies: Discrepancy[];
}

/**
 * Validates that all judges observed and recorded the same events for each rider.
 * - Wave count agreement: All judges recorded the same number of waves
 * - Jump catalog agreement: All judges recorded the same set of jumps (type + modifiers)
 */
export function validateJudgeAgreement(
  scores: Score[],
  riderIds: string[]
): AgreementValidationResult {
  const discrepancies: Discrepancy[] = [];

  // Get unique judge IDs
  const judgeIds = Array.from(new Set(scores.map((s) => s.judgeId)));

  // No validation needed if only one or zero judges
  if (judgeIds.length <= 1) {
    return { hasDiscrepancies: false, discrepancies: [] };
  }

  for (const riderId of riderIds) {
    // Check wave count agreement
    const waveCounts = new Map<string, number>();
    for (const judgeId of judgeIds) {
      const count = scores.filter(
        (s) => s.type === "wave" && s.riderId === riderId && s.judgeId === judgeId
      ).length;
      waveCounts.set(judgeId, count);
    }

    const uniqueWaveCounts = Array.from(new Set(waveCounts.values()));
    if (uniqueWaveCounts.length > 1) {
      discrepancies.push({
        type: "wave_count",
        riderId,
        details: {
          judgeCounts: Object.fromEntries(waveCounts),
        },
      });
    }

    // Check jump catalog agreement
    const jumpCatalogs = new Map<string, Set<string>>();
    for (const judgeId of judgeIds) {
      const jumps = scores.filter(
        (s): s is Extract<Score, { type: "jump" }> =>
          s.type === "jump" && s.riderId === riderId && s.judgeId === judgeId
      );

      const catalog = new Set(
        jumps.map((j) => {
          const modifiersStr = j.modifiers.sort().join(",");
          return `${j.jumpType}:${modifiersStr}`;
        })
      );

      jumpCatalogs.set(judgeId, catalog);
    }

    // Compare all catalogs
    const catalogArrays = Array.from(jumpCatalogs.values());
    if (catalogArrays.length > 1) {
      const firstCatalog = catalogArrays[0];
      const allMatch = catalogArrays.every((catalog) => {
        if (catalog.size !== firstCatalog.size) return false;
        for (const item of catalog) {
          if (!firstCatalog.has(item)) return false;
        }
        return true;
      });

      if (!allMatch) {
        discrepancies.push({
          type: "jump_catalog",
          riderId,
          details: {
            judgeCatalogs: Object.fromEntries(
              Array.from(jumpCatalogs.entries()).map(([judgeId, catalog]) => [
                judgeId,
                Array.from(catalog),
              ])
            ),
          },
        });
      }
    }
  }

  return {
    hasDiscrepancies: discrepancies.length > 0,
    discrepancies,
  };
}
