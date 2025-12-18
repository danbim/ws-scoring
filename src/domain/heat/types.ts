// Jump types that can be scored in a heat
export type JumpType =
  | "forward"
  | "backloop"
  | "doubleForward"
  | "pushLoop"
  | "pushForward"
  | "tableTop"
  | "cheeseRoll";

// Heat rules configuration
export interface HeatRules {
  wavesCounting: number; // Number of best waves to count
  jumpsCounting: number; // Number of best jumps to count
}

// Score entry in the heat state
export interface WaveScore {
  type: "wave";
  scoreUUID: string;
  riderId: string;
  score: number; // 0-10 scale
  timestamp: Date;
}

export interface JumpScore {
  type: "jump";
  scoreUUID: string;
  riderId: string;
  score: number; // 0-10 scale
  jumpType: JumpType;
  timestamp: Date;
}

export type Score = WaveScore | JumpScore;

// Heat aggregate state
export interface HeatState {
  heatId: string;
  riderIds: string[];
  heatRules: HeatRules;
  scores: Score[];
}

// Commands
export interface CreateHeat {
  type: "CreateHeat";
  data: {
    heatId: string;
    riderIds: string[];
    heatRules: HeatRules;
  };
}

export interface AddWaveScore {
  type: "AddWaveScore";
  data: {
    heatId: string;
    scoreUUID: string;
    riderId: string;
    waveScore: number; // 0-10 scale
    timestamp: Date;
  };
}

export interface AddJumpScore {
  type: "AddJumpScore";
  data: {
    heatId: string;
    scoreUUID: string;
    riderId: string;
    jumpScore: number; // 0-10 scale
    jumpType: JumpType;
    timestamp: Date;
  };
}

export type HeatCommand = CreateHeat | AddWaveScore | AddJumpScore;

// Events
export interface HeatCreated {
  type: "HeatCreated";
  data: {
    heatId: string;
    riderIds: string[];
    heatRules: HeatRules;
  };
}

export interface WaveScoreAdded {
  type: "WaveScoreAdded";
  data: {
    heatId: string;
    scoreUUID: string;
    riderId: string;
    waveScore: number;
    timestamp: Date;
  };
}

export interface JumpScoreAdded {
  type: "JumpScoreAdded";
  data: {
    heatId: string;
    scoreUUID: string;
    riderId: string;
    jumpScore: number;
    jumpType: JumpType;
    timestamp: Date;
  };
}

export type HeatEvent = HeatCreated | WaveScoreAdded | JumpScoreAdded;
