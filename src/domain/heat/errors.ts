// Heat domain errors

export type BadUserRequestError =
  | HeatAlreadyExistsError
  | HeatDoesNotExistError
  | NonUniqueRiderIdsError
  | RiderNotInHeatError
  | ScoreMustBeInValidRangeError
  | ScoreUUIDAlreadyExistsError
  | InvalidHeatRulesError
  | RiderAlreadyInHeatError
  | HeatCompletedError;

export class HeatAlreadyExistsError extends Error {
  constructor(heatId: string) {
    super(`Heat ${heatId} already exists`);
  }
}

export class HeatDoesNotExistError extends Error {
  constructor(heatId: string) {
    super(`Heat ${heatId} does not exist`);
  }
}

export class NonUniqueRiderIdsError extends Error {
  constructor() {
    super("Rider IDs must be unique");
  }
}

export class RiderNotInHeatError extends Error {
  constructor(riderId: string, heatId: string) {
    super(`Rider ${riderId} is not in heat ${heatId}`);
  }
}

export class ScoreMustBeInValidRangeError extends Error {
  constructor(score: number) {
    super(`Score ${score} must be between 0 and 10`);
  }
}

export class ScoreUUIDAlreadyExistsError extends Error {
  constructor(scoreUUID: string) {
    super(`Score ${scoreUUID} already exists`);
  }
}

export class InvalidHeatRulesError extends Error {
  constructor() {
    super("Invalid heat rules: wavesCounting and jumpsCounting must be positive");
  }
}

export class RiderAlreadyInHeatError extends Error {
  constructor(riderId: string, heatId: string) {
    super(`Rider ${riderId} is already in heat ${heatId}`);
  }
}

export class HeatCompletedError extends Error {
  constructor(message?: string) {
    super(message ?? "Cannot modify scores in a completed heat");
  }
}
