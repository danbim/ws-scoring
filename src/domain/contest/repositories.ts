import type {
  Bracket,
  Contest,
  CreateBracketInput,
  CreateContestInput,
  CreateDivisionInput,
  CreateSeasonInput,
  Division,
  Season,
  UpdateBracketInput,
  UpdateContestInput,
  UpdateDivisionInput,
  UpdateSeasonInput,
} from "./types.js";

export interface SeasonRepository {
  createSeason(input: CreateSeasonInput): Promise<Season>;
  getSeasonById(id: string): Promise<Season | null>;
  getAllSeasons(): Promise<Season[]>;
  updateSeason(id: string, updates: UpdateSeasonInput): Promise<Season>;
  deleteSeason(id: string): Promise<void>;
}

export interface ContestRepository {
  createContest(input: CreateContestInput): Promise<Contest>;
  getContestById(id: string): Promise<Contest | null>;
  getContestsBySeasonId(seasonId: string): Promise<Contest[]>;
  getAllContests(): Promise<Contest[]>;
  updateContest(id: string, updates: UpdateContestInput): Promise<Contest>;
  deleteContest(id: string): Promise<void>;
}

export interface DivisionRepository {
  createDivision(input: CreateDivisionInput): Promise<Division>;
  getDivisionById(id: string): Promise<Division | null>;
  getDivisionsByContestId(contestId: string): Promise<Division[]>;
  getAllDivisions(): Promise<Division[]>;
  updateDivision(id: string, updates: UpdateDivisionInput): Promise<Division>;
  deleteDivision(id: string): Promise<void>;
}

export interface BracketRepository {
  createBracket(input: CreateBracketInput): Promise<Bracket>;
  getBracketById(id: string): Promise<Bracket | null>;
  getBracketsByDivisionId(divisionId: string): Promise<Bracket[]>;
  getAllBrackets(): Promise<Bracket[]>;
  updateBracket(id: string, updates: UpdateBracketInput): Promise<Bracket>;
  deleteBracket(id: string): Promise<void>;
}
