// Export all types and errors

export type { BadUserRequestError } from "./errors.js";
export {
  HeatAlreadyExistsError,
  HeatDoesNotExistError,
  InvalidHeatRulesError,
  NonUniqueRiderIdsError,
  RiderAlreadyInHeatError,
  RiderNotInHeatError,
  ScoreMustBeInValidRangeError,
  ScoreUUIDAlreadyExistsError,
} from "./errors.js";
export {
  calculateJumpTotal,
  calculateRiderScoreTotals,
  calculateWaveTotal,
  getCountingJumpScores,
  getCountingWaveScores,
} from "./score-calculator.js";
export type {
  AddJumpScore,
  AddRiderToHeat,
  AddWaveScore,
  CompleteHeat,
  CreateHeat,
  HeatCommand,
  HeatCompleted,
  HeatCreated,
  HeatEvent,
  HeatRules,
  HeatState,
  JumpModifier,
  JumpScore,
  JumpScoreAdded,
  JumpType,
  RiderAddedToHeat,
  Score,
  WaveScore,
  WaveScoreAdded,
} from "./types.js";
export type {
  HeatViewerState,
  RiderViewerData,
} from "./viewer-state.js";
export { buildHeatViewerState } from "./viewer-state.js";
