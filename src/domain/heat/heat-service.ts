import {
  HeatCompletedError,
  HeatDoesNotExistError,
  RiderNotInHeatError,
  ScoreMustBeInValidRangeError,
  ScoreNotFoundError,
  ScoreTypeMismatchError,
  ScoreUUIDAlreadyExistsError,
} from "./errors.js";
import type { HeatRepository, ScoreRepository } from "./repositories.js";
import { calculateRiderScoreTotals } from "./score-calculator-repo.js";

export class HeatService {
  constructor(
    private heatRepository: HeatRepository,
    private scoreRepository: ScoreRepository
  ) {}

  async addWaveScore(
    heatId: string,
    scoreUuid: string,
    riderId: string,
    judgeId: string,
    scoreValue: number,
    timestamp: Date
  ): Promise<void> {
    // Validate heat exists and is not completed
    const heat = await this.heatRepository.getHeatByHeatId(heatId);
    if (!heat) {
      throw new HeatDoesNotExistError(heatId);
    }
    if (heat.completedAt) {
      throw new HeatCompletedError("Heat already completed");
    }

    // Validate rider is in heat
    if (!heat.riderIds.includes(riderId)) {
      throw new RiderNotInHeatError(riderId, heatId);
    }

    // Validate score range
    if (scoreValue < 0 || scoreValue > 10) {
      throw new ScoreMustBeInValidRangeError(scoreValue);
    }

    // Check for duplicate score UUID
    const existingScore = await this.scoreRepository.getScoreByUuid(scoreUuid);
    if (existingScore) {
      throw new ScoreUUIDAlreadyExistsError(scoreUuid);
    }

    // Insert score
    await this.scoreRepository.insertScore({
      scoreUuid,
      heatId,
      riderId,
      judgeId,
      type: "wave",
      scoreValue,
      timestamp,
    });
  }

  async addJumpScore(
    heatId: string,
    scoreUuid: string,
    riderId: string,
    judgeId: string,
    scoreValue: number,
    jumpType: string,
    jumpModifiers: string[],
    timestamp: Date
  ): Promise<void> {
    // Validate heat exists and is not completed
    const heat = await this.heatRepository.getHeatByHeatId(heatId);
    if (!heat) {
      throw new HeatDoesNotExistError(heatId);
    }
    if (heat.completedAt) {
      throw new HeatCompletedError("Heat already completed");
    }

    // Validate rider is in heat
    if (!heat.riderIds.includes(riderId)) {
      throw new RiderNotInHeatError(riderId, heatId);
    }

    // Validate score range
    if (scoreValue < 0 || scoreValue > 10) {
      throw new ScoreMustBeInValidRangeError(scoreValue);
    }

    // Check for duplicate score UUID
    const existingScore = await this.scoreRepository.getScoreByUuid(scoreUuid);
    if (existingScore) {
      throw new ScoreUUIDAlreadyExistsError(scoreUuid);
    }

    // Insert score
    await this.scoreRepository.insertScore({
      scoreUuid,
      heatId,
      riderId,
      judgeId,
      type: "jump",
      scoreValue,
      jumpType,
      jumpModifiers,
      timestamp,
    });
  }

  async updateWaveScore(scoreUuid: string, scoreValue: number): Promise<void> {
    // Validate score exists
    const existingScore = await this.scoreRepository.getScoreByUuid(scoreUuid);
    if (!existingScore) {
      throw new ScoreNotFoundError(scoreUuid);
    }

    if (existingScore.type !== "wave") {
      throw new ScoreTypeMismatchError(scoreUuid, "wave", existingScore.type);
    }

    // Validate heat is not completed
    const heat = await this.heatRepository.getHeatByHeatId(existingScore.heatId);
    if (!heat) {
      throw new HeatDoesNotExistError(existingScore.heatId);
    }
    if (heat.completedAt) {
      throw new HeatCompletedError("Cannot update scores in a completed heat");
    }

    // Validate score range
    if (scoreValue < 0 || scoreValue > 10) {
      throw new ScoreMustBeInValidRangeError(scoreValue);
    }

    // Update score
    await this.scoreRepository.updateScore(scoreUuid, { scoreValue });
  }

  async updateJumpScore(
    scoreUuid: string,
    scoreValue: number,
    jumpType?: string,
    jumpModifiers?: string[]
  ): Promise<void> {
    // Validate score exists
    const existingScore = await this.scoreRepository.getScoreByUuid(scoreUuid);
    if (!existingScore) {
      throw new ScoreNotFoundError(scoreUuid);
    }

    if (existingScore.type !== "jump") {
      throw new ScoreTypeMismatchError(scoreUuid, "jump", existingScore.type);
    }

    // Validate heat is not completed
    const heat = await this.heatRepository.getHeatByHeatId(existingScore.heatId);
    if (!heat) {
      throw new HeatDoesNotExistError(existingScore.heatId);
    }
    if (heat.completedAt) {
      throw new HeatCompletedError("Cannot update scores in a completed heat");
    }

    // Validate score range
    if (scoreValue < 0 || scoreValue > 10) {
      throw new ScoreMustBeInValidRangeError(scoreValue);
    }

    // Update score
    await this.scoreRepository.updateScore(scoreUuid, { scoreValue, jumpType, jumpModifiers });
  }

  async deleteScore(scoreUuid: string): Promise<void> {
    // Validate score exists
    const existingScore = await this.scoreRepository.getScoreByUuid(scoreUuid);
    if (!existingScore) {
      throw new ScoreNotFoundError(scoreUuid);
    }

    // Validate heat is not completed
    const heat = await this.heatRepository.getHeatByHeatId(existingScore.heatId);
    if (!heat) {
      throw new HeatDoesNotExistError(existingScore.heatId);
    }
    if (heat.completedAt) {
      throw new HeatCompletedError("Cannot delete scores in a completed heat");
    }

    // Delete score
    await this.scoreRepository.deleteScore(scoreUuid);
  }

  async completeHeat(heatId: string, completedAt: Date): Promise<void> {
    // 1. Mark heat completed
    await this.heatRepository.markCompleted(heatId, completedAt);

    // 2. Calculate winner/loser from scores
    const scores = await this.scoreRepository.getScoresByHeatId(heatId);
    const heat = await this.heatRepository.getHeatByHeatId(heatId);

    if (!heat) {
      throw new HeatDoesNotExistError(heatId);
    }

    const totals = calculateRiderScoreTotals(scores, heat.wavesCounting, heat.jumpsCounting);

    if (totals.length === 0) {
      return; // No riders, nothing to advance
    }

    const winner = totals[0];
    const loser = totals.length > 1 ? totals[1] : null;

    // 3. Get metadata and advance riders
    const metadata = await this.heatRepository.getHeatMetadata(heatId);

    if (metadata?.winnerDestinationHeatId) {
      await this.heatRepository.addRiderToHeat(metadata.winnerDestinationHeatId, winner.riderId);
    }

    if (loser && metadata?.loserDestinationHeatId) {
      await this.heatRepository.addRiderToHeat(metadata.loserDestinationHeatId, loser.riderId);
    }
  }
}
