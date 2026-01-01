import type {
  AddJumpScore,
  AddWaveScore,
  CreateHeat,
  HeatCommand,
  HeatEvent,
  HeatRules,
  HeatState,
} from "./types.js";

// Initial state for a heat (null/undefined means heat doesn't exist)
export const initialState = (): HeatState | null => {
  return null;
};

// Decide function: processes commands and returns events
export const decide = (command: HeatCommand, state: HeatState | null): HeatEvent[] => {
  switch (command.type) {
    case "CreateHeat": {
      return handleCreateHeat(command, state);
    }
    case "AddWaveScore": {
      return handleAddWaveScore(command, state);
    }
    case "AddJumpScore": {
      return handleAddJumpScore(command, state);
    }
    default: {
      const _exhaustive: never = command;
      throw new Error(`Unknown command type: ${(_exhaustive as HeatCommand).type}`);
    }
  }
};

// Evolve function: applies events to state
export const evolve = (state: HeatState | null, event: HeatEvent): HeatState => {
  switch (event.type) {
    case "HeatCreated": {
      return {
        heatId: event.data.heatId,
        riderIds: [...event.data.riderIds],
        heatRules: { ...event.data.heatRules },
        scores: [],
        bracketId: event.data.bracketId,
      };
    }
    case "WaveScoreAdded": {
      if (!state) {
        throw new Error("Cannot add wave score to non-existent heat");
      }
      return {
        ...state,
        scores: [
          ...state.scores,
          {
            type: "wave",
            scoreUUID: event.data.scoreUUID,
            riderId: event.data.riderId,
            score: event.data.waveScore,
            timestamp: event.data.timestamp,
          },
        ],
      };
    }
    case "JumpScoreAdded": {
      if (!state) {
        throw new Error("Cannot add jump score to non-existent heat");
      }
      return {
        ...state,
        scores: [
          ...state.scores,
          {
            type: "jump",
            scoreUUID: event.data.scoreUUID,
            riderId: event.data.riderId,
            score: event.data.jumpScore,
            jumpType: event.data.jumpType,
            timestamp: event.data.timestamp,
          },
        ],
      };
    }
    default: {
      const _exhaustive: never = event;
      throw new Error(`Unknown event type: ${(_exhaustive as HeatEvent).type}`);
    }
  }
};

export class HeatAlreadyExistsError extends Error {
  constructor(heatId: string) {
    super(`Heat with id ${heatId} already exists`);
  }
}

export class HeatDoesNotExistError extends Error {
  constructor(heatId: string) {
    super(`Heat with id ${heatId} does not exist`);
  }
}

export class RiderNotInHeatError extends Error {
  constructor(riderId: string, heatId: string) {
    super(`Rider ${riderId} is not in heat ${heatId}`);
  }
}

export class ScoreMustBeInValidRangeError extends Error {
  constructor(score: number) {
    super(`Score must be between 0 and 10, got ${score}`);
  }
}

export class ScoreUUIDAlreadyExistsError extends Error {
  constructor(scoreUUID: string) {
    super(`Score UUID ${scoreUUID} already exists`);
  }
}

export class NonUniqueRiderIdsError extends Error {
  constructor(riderIds: string[]) {
    super(`Rider IDs must be unique, got ${riderIds.join(", ")}`);
  }
}

export class InvalidHeatRulesError extends Error {
  constructor(heatRules: HeatRules) {
    super(
      `Heat rules must have positive counting values, got ${heatRules.wavesCounting} and ${heatRules.jumpsCounting}`
    );
  }
}

export type BadUserRequestError =
  | HeatAlreadyExistsError
  | HeatDoesNotExistError
  | NonUniqueRiderIdsError
  | RiderNotInHeatError
  | ScoreMustBeInValidRangeError
  | ScoreUUIDAlreadyExistsError
  | InvalidHeatRulesError;

// Command handlers
function handleCreateHeat(command: CreateHeat, state: HeatState | null): HeatEvent[] {
  // Validation: heat must not already exist
  if (state !== null) {
    throw new HeatAlreadyExistsError(command.data.heatId);
  }

  // Validation: riderIds must be unique
  const uniqueRiderIds = new Set(command.data.riderIds);
  if (uniqueRiderIds.size !== command.data.riderIds.length) {
    throw new NonUniqueRiderIdsError(command.data.riderIds);
  }

  // Validation: heatRules must be positive
  if (command.data.heatRules.wavesCounting <= 0 || command.data.heatRules.jumpsCounting <= 0) {
    throw new InvalidHeatRulesError(command.data.heatRules);
  }

  return [
    {
      type: "HeatCreated",
      data: {
        heatId: command.data.heatId,
        riderIds: [...command.data.riderIds],
        heatRules: { ...command.data.heatRules },
        bracketId: command.data.bracketId,
      },
    },
  ];
}

function handleAddWaveScore(command: AddWaveScore, state: HeatState | null): HeatEvent[] {
  // Validation: heat must exist
  if (state === null) {
    throw new HeatDoesNotExistError(command.data.heatId);
  }

  // Validation: heatId must match
  if (state.heatId !== command.data.heatId) {
    throw new Error(`Heat ID mismatch: expected ${state.heatId}, got ${command.data.heatId}`);
  }

  // Validation: rider must be in heat
  if (!state.riderIds.includes(command.data.riderId)) {
    throw new RiderNotInHeatError(command.data.riderId, command.data.heatId);
  }

  // Validation: score must be a finite number and in valid range
  if (
    !Number.isFinite(command.data.waveScore) ||
    command.data.waveScore < 0 ||
    command.data.waveScore > 10
  ) {
    throw new ScoreMustBeInValidRangeError(command.data.waveScore);
  }

  // Validation: scoreUUID must be unique (check existing scores)
  if (state.scores.some((s) => s.scoreUUID === command.data.scoreUUID)) {
    throw new ScoreUUIDAlreadyExistsError(command.data.scoreUUID);
  }

  return [
    {
      type: "WaveScoreAdded",
      data: {
        heatId: command.data.heatId,
        scoreUUID: command.data.scoreUUID,
        riderId: command.data.riderId,
        waveScore: command.data.waveScore,
        timestamp: command.data.timestamp,
      },
    },
  ];
}

function handleAddJumpScore(command: AddJumpScore, state: HeatState | null): HeatEvent[] {
  // Validation: heat must exist
  if (state === null) {
    throw new HeatDoesNotExistError(command.data.heatId);
  }

  // Validation: heatId must match
  if (state.heatId !== command.data.heatId) {
    throw new Error(`Heat ID mismatch: expected ${state.heatId}, got ${command.data.heatId}`);
  }

  // Validation: rider must be in heat
  if (!state.riderIds.includes(command.data.riderId)) {
    throw new RiderNotInHeatError(command.data.riderId, command.data.heatId);
  }

  // Validation: score must be a finite number and in valid range
  if (
    !Number.isFinite(command.data.jumpScore) ||
    command.data.jumpScore < 0 ||
    command.data.jumpScore > 10
  ) {
    throw new ScoreMustBeInValidRangeError(command.data.jumpScore);
  }

  // Validation: scoreUUID must be unique (check existing scores)
  if (state.scores.some((s) => s.scoreUUID === command.data.scoreUUID)) {
    throw new ScoreUUIDAlreadyExistsError(command.data.scoreUUID);
  }

  return [
    {
      type: "JumpScoreAdded",
      data: {
        heatId: command.data.heatId,
        scoreUUID: command.data.scoreUUID,
        riderId: command.data.riderId,
        jumpScore: command.data.jumpScore,
        jumpType: command.data.jumpType,
        timestamp: command.data.timestamp,
      },
    },
  ];
}
