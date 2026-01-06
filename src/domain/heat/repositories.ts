import type { DbTransaction } from "../../infrastructure/db/index.js";

export interface Heat {
  id: string;
  heatId: string;
  bracketId: string | null;
  riderIds: string[];
  wavesCounting: number;
  jumpsCounting: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateHeatInput {
  heatId: string;
  bracketId: string | null;
  riderIds: string[];
  wavesCounting: number;
  jumpsCounting: number;
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
    },
    tx?: DbTransaction
  ): Promise<void>;
  completeHeat(heatId: string, completedAt: Date): Promise<void>;
  addRiderToHeat(heatId: string, riderId: string): Promise<void>;
  getHeatRiderIds(heatId: string): Promise<string[]>;
  getHeatMetadata(heatId: string): Promise<{
    winnerDestinationHeatId: string | null;
    loserDestinationHeatId: string | null;
  } | null>;
}
