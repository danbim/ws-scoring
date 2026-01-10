// Jump types that can be scored in a heat
export type JumpType =
  | "forward" // F
  | "tableTop" // T
  | "pushLoop" // P
  | "backloop" // B
  | "tableTopForward" // TF
  | "doubleForward" // 2xF
  | "pushForward" // PF
  | "tripleForward" // 3xF
  | "doubleBackloop" // 2xB
  | "doublePushLoop"; // 2xP

// Jump modifiers that can add extra points or categorization
export type JumpModifier =
  | "oneHanded" // OH
  | "oneFooted" // OF
  | "oneHandedOneFooted"; // OHOF

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
  judgeId: string; // Which judge entered this score
  score: number; // 0-10 scale
  timestamp: Date;
}

export interface JumpScore {
  type: "jump";
  scoreUUID: string;
  riderId: string;
  judgeId: string; // Which judge entered this score
  score: number; // 0-10 scale
  jumpType: JumpType;
  modifiers: JumpModifier[]; // Optional modifiers (can be empty)
  timestamp: Date;
}

export type Score = WaveScore | JumpScore;

// Heat aggregate state
export interface HeatState {
  heatId: string;
  riderIds: string[];
  heatRules: HeatRules;
  scores: Score[];
  bracketId: string; // Link to bracket
  position: string;
  completedAt: Date | null; // Null if heat is not yet completed
}

// Commands
export interface CreateHeat {
  type: "CreateHeat";
  data: {
    heatId: string;
    riderIds: string[];
    heatRules: HeatRules;
    bracketId: string;
    position: string;
    roundNumber: number;
    roundName: string;
  };
}

export interface AddWaveScore {
  type: "AddWaveScore";
  data: {
    heatId: string;
    scoreUUID: string;
    riderId: string;
    judgeId: string;
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
    judgeId: string;
    jumpScore: number; // 0-10 scale
    jumpType: JumpType;
    modifiers: JumpModifier[];
    timestamp: Date;
  };
}

export interface AddRiderToHeat {
  type: "AddRiderToHeat";
  data: {
    heatId: string;
    riderId: string;
  };
}

export interface UpdateWaveScore {
  type: "UpdateWaveScore";
  data: {
    heatId: string;
    scoreUUID: string;
    judgeId: string;
    waveScore: number;
    timestamp: Date;
  };
}

export interface UpdateJumpScore {
  type: "UpdateJumpScore";
  data: {
    heatId: string;
    scoreUUID: string;
    judgeId: string;
    jumpScore: number;
    jumpType: JumpType;
    modifiers: JumpModifier[];
    timestamp: Date;
  };
}

export interface CompleteHeat {
  type: "CompleteHeat";
  data: {
    heatId: string;
    completedAt: Date;
  };
}

export type HeatCommand =
  | CreateHeat
  | AddRiderToHeat
  | AddWaveScore
  | AddJumpScore
  | UpdateWaveScore
  | UpdateJumpScore
  | CompleteHeat;

// Events
export interface HeatCreated {
  type: "HeatCreated";
  data: {
    heatId: string;
    riderIds: string[];
    heatRules: HeatRules;
    bracketId: string;
  };
}

export interface RiderAddedToHeat {
  type: "RiderAddedToHeat";
  data: {
    heatId: string;
    riderId: string;
  };
}

export interface WaveScoreAdded {
  type: "WaveScoreAdded";
  data: {
    heatId: string;
    scoreUUID: string;
    riderId: string;
    judgeId: string;
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
    judgeId: string;
    jumpScore: number;
    jumpType: JumpType;
    modifiers: JumpModifier[];
    timestamp: Date;
  };
}

export interface WaveScoreUpdated {
  type: "WaveScoreUpdated";
  data: {
    heatId: string;
    scoreUUID: string;
    riderId: string;
    judgeId: string;
    waveScore: number;
    timestamp: Date;
  };
}

export interface JumpScoreUpdated {
  type: "JumpScoreUpdated";
  data: {
    heatId: string;
    scoreUUID: string;
    riderId: string;
    judgeId: string;
    jumpScore: number;
    jumpType: JumpType;
    modifiers: JumpModifier[];
    timestamp: Date;
  };
}

export interface HeatCompleted {
  type: "HeatCompleted";
  data: {
    heatId: string;
    completedAt: Date;
  };
}

export type HeatEvent =
  | HeatCreated
  | RiderAddedToHeat
  | WaveScoreAdded
  | JumpScoreAdded
  | WaveScoreUpdated
  | JumpScoreUpdated
  | HeatCompleted;
