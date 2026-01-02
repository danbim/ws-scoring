export interface Rider {
  id: string;
  firstName: string;
  lastName: string;
  country: string;
  sailNumber: string | null;
  email: string | null;
  dateOfBirth: Date | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface DivisionParticipant {
  id: string;
  divisionId: string;
  riderId: string;
  createdAt: Date;
}

export interface CreateRiderInput {
  firstName: string;
  lastName: string;
  country: string;
  sailNumber?: string | null;
  email?: string | null;
  dateOfBirth?: Date | null;
}

export interface UpdateRiderInput {
  firstName?: string;
  lastName?: string;
  country?: string;
  sailNumber?: string | null;
  email?: string | null;
  dateOfBirth?: Date | null;
}
