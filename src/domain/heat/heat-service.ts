import type { DbTransaction } from "../../infrastructure/db/index.js";
import { getDb } from "../../infrastructure/db/index.js";
import {
  HeatDoesNotExistError,
  RiderNotInHeatError,
  ScoreMustBeInValidRangeError,
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
      throw new Error("Heat already completed");
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
      scoreType: "wave",
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
      throw new Error("Heat already completed");
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
      scoreType: "jump",
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
      throw new Error(`Score ${scoreUuid} not found`);
    }

    if (existingScore.scoreType !== "wave") {
      throw new Error(`Score ${scoreUuid} is not a wave score`);
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
      throw new Error(`Score ${scoreUuid} not found`);
    }

    if (existingScore.scoreType !== "jump") {
      throw new Error(`Score ${scoreUuid} is not a jump score`);
    }

    // Validate score range
    if (scoreValue < 0 || scoreValue > 10) {
      throw new ScoreMustBeInValidRangeError(scoreValue);
    }

    // Update score
    await this.scoreRepository.updateScore(scoreUuid, { scoreValue, jumpType, jumpModifiers });
  }

  async completeHeat(heatId: string, completedAt: Date): Promise<void> {
    const db = await getDb();
    await db.transaction((txn) => this.completeHeatInternal(heatId, completedAt, txn));
  }

  private async completeHeatInternal(
    heatId: string,
    completedAt: Date,
    tx: DbTransaction
  ): Promise<void> {
    // 1. Mark heat completed
    await this.heatRepository.markCompleted(heatId, completedAt, tx);

    // 2. Calculate winner/loser from scores
    const scores = await this.scoreRepository.getScoresByHeatId(heatId, tx);
    const heat = await this.heatRepository.getHeatByHeatId(heatId, tx);

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
    const metadata = await this.heatRepository.getHeatMetadata(heatId, tx);

    if (metadata?.winnerDestinationHeatId) {
      await this.advanceRider(metadata.winnerDestinationHeatId, winner.riderId, tx);
    }

    if (loser && metadata?.loserDestinationHeatId) {
      await this.advanceRider(metadata.loserDestinationHeatId, loser.riderId, tx);
    }
  }

  private async advanceRider(
    destHeatId: string,
    riderId: string,
    tx: DbTransaction
  ): Promise<void> {
    await this.heatRepository.addRiderToHeat(destHeatId, riderId, tx);

    // Check if it's a bye heat (1 rider) and auto-complete
    const riderIds = await this.heatRepository.getHeatRiderIds(destHeatId, tx);
    if (riderIds.length === 1) {
      await this.completeHeatInternal(destHeatId, new Date(), tx);
    }
  }
}
