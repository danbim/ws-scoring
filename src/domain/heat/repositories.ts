export interface Heat {
  id: string;
  heatId: string;
  bracketId: string;
  riderIds: string[];
  wavesCounting: number;
  jumpsCounting: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateHeatInput {
  heatId: string;
  bracketId: string;
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
}
