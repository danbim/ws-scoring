import type { DbTransaction } from "../../infrastructure/db/index.js";

export interface Heat {
  id: string;
  heatId: string;
  bracketId: string;
  riderIds: string[];
  wavesCounting: number;
  jumpsCounting: number;
  position: string;
  roundNumber: number;
  roundName: string;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateHeatInput {
  heatId: string;
  bracketId: string;
  riderIds: string[];
  wavesCounting: number;
  jumpsCounting: number;
  position: string;
  roundNumber: number;
  roundName: string;
}

export interface UpdateHeatInput {
  riderIds?: string[];
  wavesCounting?: number;
  jumpsCounting?: number;
}

export interface HeatRepository {
  createHeat(input: CreateHeatInput): Promise<Heat>;
  getHeatByHeatId(heatId: string, tx?: DbTransaction): Promise<Heat | null>;
  getHeatsByBracketId(bracketId: string): Promise<Heat[]>;
  getAllHeats(): Promise<Heat[]>;
  updateHeat(heatId: string, updates: UpdateHeatInput): Promise<Heat>;
  deleteHeat(heatId: string): Promise<void>;
  createHeatWithBracketMetadata(
    data: {
      heatId: string;
      bracketId: string;
      riderIds: string[];
      wavesCounting: number;
      jumpsCounting: number;
      roundNumber: number;
      roundName: string;
      position: string;
      winnerDestinationHeatId: string | null;
      loserDestinationHeatId: string | null;
    },
    tx?: DbTransaction
  ): Promise<void>;
  completeHeat(heatId: string, completedAt: Date): Promise<void>;
  markCompleted(heatId: string, completedAt: Date, tx: DbTransaction): Promise<void>;
  addRiderToHeat(heatId: string, riderId: string, tx: DbTransaction): Promise<void>;
  getHeatRiderIds(heatId: string, tx: DbTransaction): Promise<string[]>;
  getHeatMetadata(
    heatId: string,
    tx: DbTransaction
  ): Promise<{
    winnerDestinationHeatId: string | null;
    loserDestinationHeatId: string | null;
  } | null>;
}

export interface Score {
  id: string;
  scoreUuid: string;
  heatId: string;
  riderId: string;
  judgeId: string;
  type: "wave" | "jump";
  scoreValue: number;
  jumpType: string | null;
  jumpModifiers: string[] | null;
  timestamp: Date;
  createdAt: Date;
}

export interface InsertScoreInput {
  scoreUuid: string;
  heatId: string;
  riderId: string;
  judgeId: string;
  type: "wave" | "jump";
  scoreValue: number;
  jumpType?: string;
  jumpModifiers?: string[];
  timestamp: Date;
}

export interface UpdateScoreInput {
  scoreValue?: number;
  jumpType?: string;
  jumpModifiers?: string[];
}

export interface ScoreRepository {
  insertScore(score: InsertScoreInput, tx?: DbTransaction): Promise<void>;
  getScoresByHeatId(heatId: string, tx?: DbTransaction): Promise<Score[]>;
  getScoreByUuid(scoreUuid: string, tx?: DbTransaction): Promise<Score | null>;
  updateScore(scoreUuid: string, updates: UpdateScoreInput, tx?: DbTransaction): Promise<void>;
}
