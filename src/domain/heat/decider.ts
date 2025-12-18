import type {
  HeatCommand,
  HeatEvent,
  HeatState,
  CreateHeat,
  AddWaveScore,
  AddJumpScore,
} from "./types.js";

// Initial state for a heat (null/undefined means heat doesn't exist)
export const initialState = (): HeatState | null => {
  return null;
};

// Decide function: processes commands and returns events
export const decide = (
  command: HeatCommand,
  state: HeatState | null
): HeatEvent[] => {
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
      throw new Error(
        `Unknown command type: ${(_exhaustive as HeatCommand).type}`
      );
    }
  }
};

// Evolve function: applies events to state
export const evolve = (
  state: HeatState | null,
  event: HeatEvent
): HeatState => {
  switch (event.type) {
    case "HeatCreated": {
      return {
        heatId: event.data.heatId,
        riderIds: [...event.data.riderIds],
        heatRules: { ...event.data.heatRules },
        scores: [],
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

// Command handlers
function handleCreateHeat(
  command: CreateHeat,
  state: HeatState | null
): HeatEvent[] {
  // Validation: heat must not already exist
  if (state !== null) {
    throw new Error(`Heat with id ${command.data.heatId} already exists`);
  }

  // Validation: must have at least one rider
  if (command.data.riderIds.length === 0) {
    throw new Error("Heat must have at least one rider");
  }

  // Validation: riderIds must be unique
  const uniqueRiderIds = new Set(command.data.riderIds);
  if (uniqueRiderIds.size !== command.data.riderIds.length) {
    throw new Error("Rider IDs must be unique");
  }

  // Validation: heatRules must be positive
  if (
    command.data.heatRules.wavesCounting <= 0 ||
    command.data.heatRules.jumpsCounting <= 0
  ) {
    throw new Error("Heat rules must have positive counting values");
  }

  return [
    {
      type: "HeatCreated",
      data: {
        heatId: command.data.heatId,
        riderIds: [...command.data.riderIds],
        heatRules: { ...command.data.heatRules },
      },
    },
  ];
}

function handleAddWaveScore(
  command: AddWaveScore,
  state: HeatState | null
): HeatEvent[] {
  // Validation: heat must exist
  if (state === null) {
    throw new Error(`Heat with id ${command.data.heatId} does not exist`);
  }

  // Validation: heatId must match
  if (state.heatId !== command.data.heatId) {
    throw new Error(
      `Heat ID mismatch: expected ${state.heatId}, got ${command.data.heatId}`
    );
  }

  // Validation: rider must be in heat
  if (!state.riderIds.includes(command.data.riderId)) {
    throw new Error(
      `Rider ${command.data.riderId} is not in heat ${command.data.heatId}`
    );
  }

  // Validation: score must be a finite number
  if (!Number.isFinite(command.data.waveScore)) {
    throw new Error(
      `Wave score must be a valid number, got ${command.data.waveScore}`
    );
  }

  // Validation: score must be in valid range (0-10)
  if (command.data.waveScore < 0 || command.data.waveScore > 10) {
    throw new Error(
      `Wave score must be between 0 and 10, got ${command.data.waveScore}`
    );
  }

  // Validation: scoreUUID must be unique (check existing scores)
  const existingScoreUUIDs = state.scores.map((s) => s.scoreUUID);
  if (existingScoreUUIDs.includes(command.data.scoreUUID)) {
    throw new Error(
      `Score UUID ${command.data.scoreUUID} already exists in heat`
    );
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

function handleAddJumpScore(
  command: AddJumpScore,
  state: HeatState | null
): HeatEvent[] {
  // Validation: heat must exist
  if (state === null) {
    throw new Error(`Heat with id ${command.data.heatId} does not exist`);
  }

  // Validation: heatId must match
  if (state.heatId !== command.data.heatId) {
    throw new Error(
      `Heat ID mismatch: expected ${state.heatId}, got ${command.data.heatId}`
    );
  }

  // Validation: rider must be in heat
  if (!state.riderIds.includes(command.data.riderId)) {
    throw new Error(
      `Rider ${command.data.riderId} is not in heat ${command.data.heatId}`
    );
  }

  // Validation: score must be a finite number
  if (!Number.isFinite(command.data.jumpScore)) {
    throw new Error(
      `Jump score must be a valid number, got ${command.data.jumpScore}`
    );
  }

  // Validation: score must be in valid range (0-10)
  if (command.data.jumpScore < 0 || command.data.jumpScore > 10) {
    throw new Error(
      `Jump score must be between 0 and 10, got ${command.data.jumpScore}`
    );
  }

  // Validation: scoreUUID must be unique (check existing scores)
  const existingScoreUUIDs = state.scores.map((s) => s.scoreUUID);
  if (existingScoreUUIDs.includes(command.data.scoreUUID)) {
    throw new Error(
      `Score UUID ${command.data.scoreUUID} already exists in heat`
    );
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
