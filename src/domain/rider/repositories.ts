import type { CreateRiderInput, DivisionParticipant, Rider, UpdateRiderInput } from "./types.js";

export interface RiderRepository {
  createRider(input: CreateRiderInput): Promise<Rider>;
  getRiderById(id: string, includeDeleted?: boolean): Promise<Rider | null>;
  getAllRiders(includeDeleted?: boolean): Promise<Rider[]>;
  updateRider(id: string, updates: UpdateRiderInput): Promise<Rider>;
  deleteRider(id: string): Promise<void>; // Soft delete
  restoreRider(id: string): Promise<Rider>;
}

export interface DivisionParticipantRepository {
  addParticipant(divisionId: string, riderId: string): Promise<DivisionParticipant>;
  removeParticipant(divisionId: string, riderId: string): Promise<void>;
  getParticipantsByDivisionId(divisionId: string): Promise<Rider[]>;
  getDivisionsByRiderId(riderId: string): Promise<string[]>; // Returns division IDs
  isParticipant(divisionId: string, riderId: string): Promise<boolean>;
}
