export type BracketFormat = "single_elimination" | "double_elimination" | "dingle";

export type DivisionCategory =
  | "pro_men"
  | "pro_women"
  | "amateur_men"
  | "amateur_women"
  | "pro_youth"
  | "amateur_youth"
  | "pro_masters"
  | "amateur_masters";

export type ContestStatus = "draft" | "scheduled" | "in_progress" | "completed" | "cancelled";

export interface Season {
  id: string;
  name: string;
  year: number;
  startDate: Date;
  endDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Contest {
  id: string;
  seasonId: string;
  name: string;
  location: string;
  startDate: Date;
  endDate: Date;
  status: ContestStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface Division {
  id: string;
  contestId: string;
  name: string;
  category: DivisionCategory;
  createdAt: Date;
  updatedAt: Date;
}

export interface Bracket {
  id: string;
  divisionId: string;
  name: string;
  format: BracketFormat;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSeasonInput {
  name: string;
  year: number;
  startDate: Date;
  endDate: Date;
}

export interface UpdateSeasonInput {
  name?: string;
  year?: number;
  startDate?: Date;
  endDate?: Date;
}

export interface CreateContestInput {
  seasonId: string;
  name: string;
  location: string;
  startDate: Date;
  endDate: Date;
  status: ContestStatus;
}

export interface UpdateContestInput {
  seasonId?: string;
  name?: string;
  location?: string;
  startDate?: Date;
  endDate?: Date;
  status?: ContestStatus;
}

export interface CreateDivisionInput {
  contestId: string;
  name: string;
  category: DivisionCategory;
}

export interface UpdateDivisionInput {
  contestId?: string;
  name?: string;
  category?: DivisionCategory;
}

export interface CreateBracketInput {
  divisionId: string;
  name: string;
  format: BracketFormat;
  status: string;
}

export interface UpdateBracketInput {
  divisionId?: string;
  name?: string;
  format?: BracketFormat;
  status?: string;
}
