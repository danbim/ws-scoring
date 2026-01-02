// Frontend type definitions matching API response schemas

export interface Season {
  id: string;
  name: string;
  year: number;
  startDate: string;
  endDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface Contest {
  id: string;
  seasonId: string;
  name: string;
  location: string;
  startDate: string;
  endDate: string;
  status: "draft" | "scheduled" | "in_progress" | "completed" | "cancelled";
  createdAt: string;
  updatedAt: string;
}

export interface Division {
  id: string;
  contestId: string;
  name: string;
  category:
    | "pro_men"
    | "pro_women"
    | "amateur_men"
    | "amateur_women"
    | "pro_youth"
    | "amateur_youth"
    | "pro_masters"
    | "amateur_masters";
  createdAt: string;
  updatedAt: string;
}

export interface Bracket {
  id: string;
  divisionId: string;
  name: string;
  format: "single_elimination" | "double_elimination" | "dingle";
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface Heat {
  heatId: string;
  riderIds: string[];
  heatRules: {
    wavesCounting: number;
    jumpsCounting: number;
  };
  scores: Array<{
    type: "wave" | "jump";
    scoreUUID: string;
    riderId: string;
    score: number;
    jumpType?: string;
    timestamp: string;
  }>;
  bracketId: string;
}

export interface Rider {
  id: string;
  firstName: string;
  lastName: string;
  country: string;
  sailNumber: string | null;
  email: string | null;
  dateOfBirth: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
