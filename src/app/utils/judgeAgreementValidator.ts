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
  riderNames: Record<string, string>,
  judgeIds: string[]
): ValidationResult {
  const riderIds = Array.from(new Set(scores.map((s) => s.riderId)));

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

    // Check jump catalogs (counting duplicates - same jump can be recorded multiple times)
    const jumpCatalogs: Record<string, string[]> = {};
    for (const judgeId of judgeIds) {
      const jumps = scores.filter(
        (s) => s.type === "jump" && s.riderId === riderId && s.judgeId === judgeId
      );

      const catalog = jumps
        .map((j) => {
          const modifiersStr = (j.modifiers || []).sort().join(",");
          return `${j.jumpType}:${modifiersStr}`;
        })
        .sort();

      jumpCatalogs[judgeId] = catalog;
    }

    const catalogArrays = Object.values(jumpCatalogs);
    if (catalogArrays.length > 1) {
      const firstCatalog = catalogArrays[0];
      const allMatch = catalogArrays.every((catalog) => {
        if (catalog.length !== firstCatalog.length) return false;
        return catalog.every((item, idx) => item === firstCatalog[idx]);
      });

      if (!allMatch) {
        riderDiscrepancy.jumpDiscrepancy = { judgeCatalogs: jumpCatalogs };
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
