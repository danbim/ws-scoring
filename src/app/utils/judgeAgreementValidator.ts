export interface JudgeScore {
  scoreUUID: string;
  riderId: string;
  judgeId: string;
  type: "wave" | "jump";
  scoreValue: number;
  jumpType: string | null;
  modifiers: string[] | null;
  timestamp: Date;
}

export interface RiderDiscrepancy {
  riderId: string;
  riderName: string;
  waveDiscrepancy?: {
    judgeCounts: Record<string, number>;
  };
  jumpDiscrepancy?: {
    judgeCatalogs: Record<string, string[]>;
  };
}

export interface ValidationResult {
  hasDiscrepancies: boolean;
  discrepancies: RiderDiscrepancy[];
}

export function validateJudgeAgreementFrontend(
  scores: JudgeScore[],
  riderNames: Record<string, string>
): ValidationResult {
  const riderIds = Array.from(new Set(scores.map((s) => s.riderId)));
  const judgeIds = Array.from(new Set(scores.map((s) => s.judgeId)));

  if (judgeIds.length <= 1) {
    return { hasDiscrepancies: false, discrepancies: [] };
  }

  const discrepancies: RiderDiscrepancy[] = [];

  for (const riderId of riderIds) {
    const riderName = riderNames[riderId] || "Unknown Rider";
    const riderDiscrepancy: RiderDiscrepancy = {
      riderId,
      riderName,
    };

    // Check wave counts
    const waveCounts: Record<string, number> = {};
    for (const judgeId of judgeIds) {
      const count = scores.filter(
        (s) => s.type === "wave" && s.riderId === riderId && s.judgeId === judgeId
      ).length;
      waveCounts[judgeId] = count;
    }

    const uniqueWaveCounts = Array.from(new Set(Object.values(waveCounts)));
    if (uniqueWaveCounts.length > 1) {
      riderDiscrepancy.waveDiscrepancy = { judgeCounts: waveCounts };
    }

    // Check jump catalogs (using Sets to handle duplicates and order)
    const jumpCatalogs: Record<string, Set<string>> = {};
    for (const judgeId of judgeIds) {
      const jumps = scores.filter(
        (s) => s.type === "jump" && s.riderId === riderId && s.judgeId === judgeId
      );

      const catalog = new Set(
        jumps.map((j) => {
          const modifiersStr = (j.modifiers || []).sort().join(",");
          return `${j.jumpType}:${modifiersStr}`;
        })
      );

      jumpCatalogs[judgeId] = catalog;
    }

    const catalogSets = Object.values(jumpCatalogs);
    if (catalogSets.length > 1) {
      const firstCatalog = catalogSets[0];
      const allMatch = catalogSets.every((catalog) => {
        if (catalog.size !== firstCatalog.size) return false;
        for (const item of catalog) {
          if (!firstCatalog.has(item)) return false;
        }
        return true;
      });

      if (!allMatch) {
        // Convert Sets to arrays for the result
        const catalogArrays: Record<string, string[]> = {};
        for (const [judgeId, catalog] of Object.entries(jumpCatalogs)) {
          catalogArrays[judgeId] = Array.from(catalog).sort();
        }
        riderDiscrepancy.jumpDiscrepancy = { judgeCatalogs: catalogArrays };
      }
    }

    if (riderDiscrepancy.waveDiscrepancy || riderDiscrepancy.jumpDiscrepancy) {
      discrepancies.push(riderDiscrepancy);
    }
  }

  return {
    hasDiscrepancies: discrepancies.length > 0,
    discrepancies,
  };
}
