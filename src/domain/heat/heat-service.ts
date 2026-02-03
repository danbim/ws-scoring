import { err, ok, type Result } from "../result.js";
import type { HeatServiceError } from "./errors.js";
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
  ): Promise<Result<void, HeatServiceError>> {
    // Validate heat exists and is not completed
    const heat = await this.heatRepository.getHeatByHeatId(heatId);
    if (!heat) {
      return err(new HeatDoesNotExistError(heatId));
    }
    if (heat.completedAt) {
      return err(new HeatCompletedError("Heat already completed"));
    }
    if (!heat.riderIds.includes(riderId)) {
      return err(new RiderNotInHeatError(riderId, heatId));
    }
    if (scoreValue < 0 || scoreValue > 10) {
      return err(new ScoreMustBeInValidRangeError(scoreValue));
    }
    const existingScore = await this.scoreRepository.getScoreByUuid(scoreUuid);
    if (existingScore) {
      return err(new ScoreUUIDAlreadyExistsError(scoreUuid));
    }

    await this.scoreRepository.insertScore({
      scoreUuid,
      heatId,
      riderId,
      judgeId,
      type: "wave",
      scoreValue,
      timestamp,
    });

    return ok(undefined);
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
  ): Promise<Result<void, HeatServiceError>> {
    const heat = await this.heatRepository.getHeatByHeatId(heatId);
    if (!heat) {
      return err(new HeatDoesNotExistError(heatId));
    }
    if (heat.completedAt) {
      return err(new HeatCompletedError("Heat already completed"));
    }
    if (!heat.riderIds.includes(riderId)) {
      return err(new RiderNotInHeatError(riderId, heatId));
    }
    if (scoreValue < 0 || scoreValue > 10) {
      return err(new ScoreMustBeInValidRangeError(scoreValue));
    }
    const existingScore = await this.scoreRepository.getScoreByUuid(scoreUuid);
    if (existingScore) {
      return err(new ScoreUUIDAlreadyExistsError(scoreUuid));
    }

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

    return ok(undefined);
  }

  async updateWaveScore(
    scoreUuid: string,
    scoreValue: number
  ): Promise<Result<void, HeatServiceError>> {
    const existingScore = await this.scoreRepository.getScoreByUuid(scoreUuid);
    if (!existingScore) {
      return err(new ScoreNotFoundError(scoreUuid));
    }
    if (existingScore.type !== "wave") {
      return err(new ScoreTypeMismatchError(scoreUuid, "wave", existingScore.type));
    }
    const heat = await this.heatRepository.getHeatByHeatId(existingScore.heatId);
    if (!heat) {
      return err(new HeatDoesNotExistError(existingScore.heatId));
    }
    if (heat.completedAt) {
      return err(new HeatCompletedError("Cannot update scores in a completed heat"));
    }
    if (scoreValue < 0 || scoreValue > 10) {
      return err(new ScoreMustBeInValidRangeError(scoreValue));
    }

    await this.scoreRepository.updateScore(scoreUuid, { scoreValue });

    return ok(undefined);
  }

  async updateJumpScore(
    scoreUuid: string,
    scoreValue: number,
    jumpType?: string,
    jumpModifiers?: string[]
  ): Promise<Result<void, HeatServiceError>> {
    const existingScore = await this.scoreRepository.getScoreByUuid(scoreUuid);
    if (!existingScore) {
      return err(new ScoreNotFoundError(scoreUuid));
    }
    if (existingScore.type !== "jump") {
      return err(new ScoreTypeMismatchError(scoreUuid, "jump", existingScore.type));
    }
    const heat = await this.heatRepository.getHeatByHeatId(existingScore.heatId);
    if (!heat) {
      return err(new HeatDoesNotExistError(existingScore.heatId));
    }
    if (heat.completedAt) {
      return err(new HeatCompletedError("Cannot update scores in a completed heat"));
    }
    if (scoreValue < 0 || scoreValue > 10) {
      return err(new ScoreMustBeInValidRangeError(scoreValue));
    }

    await this.scoreRepository.updateScore(scoreUuid, { scoreValue, jumpType, jumpModifiers });

    return ok(undefined);
  }

  async deleteScore(scoreUuid: string): Promise<Result<void, HeatServiceError>> {
    const existingScore = await this.scoreRepository.getScoreByUuid(scoreUuid);
    if (!existingScore) {
      return err(new ScoreNotFoundError(scoreUuid));
    }
    const heat = await this.heatRepository.getHeatByHeatId(existingScore.heatId);
    if (!heat) {
      return err(new HeatDoesNotExistError(existingScore.heatId));
    }
    if (heat.completedAt) {
      return err(new HeatCompletedError("Cannot delete scores in a completed heat"));
    }

    await this.scoreRepository.deleteScore(scoreUuid);

    return ok(undefined);
  }

  async completeHeat(heatId: string, completedAt: Date): Promise<Result<void, HeatServiceError>> {
    // 1. Mark heat completed
    await this.heatRepository.markCompleted(heatId, completedAt);

    // 2. Calculate winner/loser from scores
    const scores = await this.scoreRepository.getScoresByHeatId(heatId);
    const heat = await this.heatRepository.getHeatByHeatId(heatId);

    if (!heat) {
      return err(new HeatDoesNotExistError(heatId));
    }

    const totals = calculateRiderScoreTotals(scores, heat.wavesCounting, heat.jumpsCounting);

    if (totals.length === 0) {
      return ok(undefined); // No riders, nothing to advance
    }

    const winner = totals[0];
    const loser = totals.length > 1 ? totals[1] : null;

    // 3. Get metadata and advance riders
    const metadata = await this.heatRepository.getHeatMetadata(heatId);

    if (metadata?.winnerDestinationHeatId) {
      // Validate that destination heat exists before adding rider
      const destinationHeat = await this.heatRepository.getHeatByHeatId(
        metadata.winnerDestinationHeatId
      );
      if (!destinationHeat) {
        return err(new HeatDoesNotExistError(metadata.winnerDestinationHeatId));
      }
      await this.heatRepository.addRiderToHeat(metadata.winnerDestinationHeatId, winner.riderId);
    }

    if (loser && metadata?.loserDestinationHeatId) {
      // Validate that destination heat exists before adding rider
      const destinationHeat = await this.heatRepository.getHeatByHeatId(
        metadata.loserDestinationHeatId
      );
      if (!destinationHeat) {
        return err(new HeatDoesNotExistError(metadata.loserDestinationHeatId));
      }
      await this.heatRepository.addRiderToHeat(metadata.loserDestinationHeatId, loser.riderId);
    }

    return ok(undefined);
  }
}
