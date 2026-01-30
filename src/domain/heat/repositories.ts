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
  getHeatByHeatId(heatId: string): Promise<Heat | null>;
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
    }
  ): Promise<void>;
  markCompleted(heatId: string, completedAt: Date): Promise<void>;
  addRiderToHeat(heatId: string, riderId: string): Promise<void>;
  getHeatRiderIds(heatId: string): Promise<string[]>;
  getHeatMetadata(
    heatId: string
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
  insertScore(score: InsertScoreInput): Promise<void>;
  getScoresByHeatId(heatId: string): Promise<Score[]>;
  getScoreByUuid(scoreUuid: string): Promise<Score | null>;
  updateScore(scoreUuid: string, updates: UpdateScoreInput): Promise<void>;
  deleteScore(scoreUuid: string): Promise<void>;
}
