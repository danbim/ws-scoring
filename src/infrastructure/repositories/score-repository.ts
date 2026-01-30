import {eq} from "drizzle-orm";
import type {InsertScoreInput, Score, ScoreRepository, UpdateScoreInput,} from "../../domain/heat/repositories.js";
import type {DbConnection} from "../db/index.js";
import {scores} from "../db/schema.js";

export class ScoreRepositoryImpl implements ScoreRepository {
  constructor(private conn: DbConnection) {}

  private mapDbScoreToScore(score: typeof scores.$inferSelect): Score {
    return {
      id: score.id,
      scoreUuid: score.scoreUuid,
      heatId: score.heatId,
      riderId: score.riderId,
      judgeId: score.judgeId,
      type: score.type as "wave" | "jump",
      scoreValue: Number(score.scoreValue),
      jumpType: score.jumpType,
      jumpModifiers: score.jumpModifiers ? JSON.parse(score.jumpModifiers) : null,
      timestamp: score.timestamp,
      createdAt: score.createdAt,
    };
  }

  async insertScore(score: InsertScoreInput): Promise<void> {
    await this.conn.insert(scores).values({
      scoreUuid: score.scoreUuid,
      heatId: score.heatId,
      riderId: score.riderId,
      judgeId: score.judgeId,
      type: score.type,
      scoreValue: score.scoreValue.toString(),
      jumpType: score.jumpType ?? null,
      jumpModifiers: score.jumpModifiers ? JSON.stringify(score.jumpModifiers) : null,
      timestamp: score.timestamp,
    });
  }

  async getScoresByHeatId(heatId: string): Promise<Score[]> {
    const heatScores = await this.conn.select().from(scores).where(eq(scores.heatId, heatId));
    return heatScores.map((score) => this.mapDbScoreToScore(score));
  }

  async getScoreByUuid(scoreUuid: string): Promise<Score | null> {
    const [score] = await this.conn.select().from(scores).where(eq(scores.scoreUuid, scoreUuid)).limit(1);

    if (!score) {
      return null;
    }

    return this.mapDbScoreToScore(score);
  }

  async updateScore(scoreUuid: string, updates: UpdateScoreInput): Promise<void> {
    const updateData: {
      scoreValue?: string;
      jumpType?: string | null;
      jumpModifiers?: string | null;
    } = {};

    if (updates.scoreValue !== undefined) {
      updateData.scoreValue = updates.scoreValue.toString();
    }
    if (updates.jumpType !== undefined) {
      updateData.jumpType = updates.jumpType;
    }
    if (updates.jumpModifiers !== undefined) {
      updateData.jumpModifiers = JSON.stringify(updates.jumpModifiers);
    }

    await this.conn.update(scores).set(updateData).where(eq(scores.scoreUuid, scoreUuid));
  }

  async deleteScore(scoreUuid: string): Promise<void> {
    await this.conn.delete(scores).where(eq(scores.scoreUuid, scoreUuid));
  }
}
