import {eq} from "drizzle-orm";
import type {CreateHeatInput, Heat, HeatRepository, UpdateHeatInput,} from "../../domain/heat/repositories.js";
import type {DbConnection} from "../db/index.js";
import {heats} from "../db/schema.js";

export class HeatRepositoryImpl implements HeatRepository {
  constructor(private conn: DbConnection) {}

  private mapDbHeatToHeat(heat: typeof heats.$inferSelect): Heat {
    return {
      id: heat.id,
      heatId: heat.heatId,
      bracketId: heat.bracketId,
      riderIds: JSON.parse(heat.riderIds) as string[],
      wavesCounting: heat.wavesCounting,
      jumpsCounting: heat.jumpsCounting,
      position: heat.position,
      roundNumber: heat.roundNumber,
      roundName: heat.roundName,
      completedAt: heat.completedAt,
      createdAt: heat.createdAt,
      updatedAt: heat.updatedAt,
    };
  }

  async createHeat(input: CreateHeatInput): Promise<Heat> {
    const result = await this.conn
      .insert(heats)
      .values({
        heatId: input.heatId,
        bracketId: input.bracketId,
        riderIds: JSON.stringify(input.riderIds),
        wavesCounting: input.wavesCounting,
        jumpsCounting: input.jumpsCounting,
        position: input.position,
        roundNumber: input.roundNumber,
        roundName: input.roundName,
      })
      .returning();

    const [newHeat] = result;
    return this.mapDbHeatToHeat(newHeat);
  }

  async getHeatByHeatId(heatId: string): Promise<Heat | null> {
    const [heat] = await this.conn.select().from(heats).where(eq(heats.heatId, heatId)).limit(1);

    if (!heat) {
      return null;
    }

    return this.mapDbHeatToHeat(heat);
  }

  async getHeatsByBracketId(bracketId: string): Promise<Heat[]> {
    const bracketHeats = await this.conn.select().from(heats).where(eq(heats.bracketId, bracketId));

    return bracketHeats.map((heat) => this.mapDbHeatToHeat(heat));
  }

  async getAllHeats(): Promise<Heat[]> {
    const allHeats = await this.conn.select().from(heats);

    return allHeats.map((heat) => this.mapDbHeatToHeat(heat));
  }

  async updateHeat(heatId: string, updates: UpdateHeatInput): Promise<Heat> {
    const updateData: {
      riderIds?: string;
      wavesCounting?: number;
      jumpsCounting?: number;
      updatedAt: Date;
    } = {
      updatedAt: new Date(),
    };

    if (updates.riderIds !== undefined) {
      updateData.riderIds = JSON.stringify(updates.riderIds);
    }
    if (updates.wavesCounting !== undefined) {
      updateData.wavesCounting = updates.wavesCounting;
    }
    if (updates.jumpsCounting !== undefined) {
      updateData.jumpsCounting = updates.jumpsCounting;
    }

    const [updatedHeat] = await this.conn
      .update(heats)
      .set(updateData)
      .where(eq(heats.heatId, heatId))
      .returning();

    return this.mapDbHeatToHeat(updatedHeat);
  }

  async deleteHeat(heatId: string): Promise<void> {
    await this.conn.delete(heats).where(eq(heats.heatId, heatId));
  }

  async createHeatWithBracketMetadata(data: {
    heatId: string;
    bracketId: string;
    riderIds: string[];
    wavesCounting: number;
    jumpsCounting: number;
    roundNumber: number;
    roundName: string;
    position: string;
    winnerDestinationHeatId: string | null;
    loserDestinationHeatId: string | null;
  }): Promise<void> {
    await this.conn.insert(heats).values({
      heatId: data.heatId,
      bracketId: data.bracketId,
      riderIds: JSON.stringify(data.riderIds),
      wavesCounting: data.wavesCounting,
      jumpsCounting: data.jumpsCounting,
      roundNumber: data.roundNumber,
      roundName: data.roundName,
      position: data.position,
      winnerDestinationHeatId: data.winnerDestinationHeatId,
      loserDestinationHeatId: data.loserDestinationHeatId,
    });
  }

  async markCompleted(heatId: string, completedAt: Date): Promise<void> {
    await this.conn
      .update(heats)
      .set({
        completedAt,
        updatedAt: new Date(),
      })
      .where(eq(heats.heatId, heatId));
  }

  async addRiderToHeat(heatId: string, riderId: string): Promise<void> {
    const [heat] = await this.conn.select().from(heats).where(eq(heats.heatId, heatId)).limit(1);

    if (!heat) {
      throw new Error(`Heat ${heatId} not found`);
    }

    const riderIds = JSON.parse(heat.riderIds) as string[];

    // Only add if rider is not already in the heat
    if (!riderIds.includes(riderId)) {
      riderIds.push(riderId);
      await this.conn
        .update(heats)
        .set({
          riderIds: JSON.stringify(riderIds),
          updatedAt: new Date(),
        })
        .where(eq(heats.heatId, heatId));
    }
  }

  async getHeatRiderIds(heatId: string): Promise<string[]> {
    const [heat] = await this.conn.select().from(heats).where(eq(heats.heatId, heatId)).limit(1);

    if (!heat) {
      throw new Error(`Heat ${heatId} not found`);
    }

    return JSON.parse(heat.riderIds) as string[];
  }

  async getHeatMetadata(heatId: string): Promise<{
    winnerDestinationHeatId: string | null;
    loserDestinationHeatId: string | null;
  } | null> {
    const [heat] = await this.conn.select().from(heats).where(eq(heats.heatId, heatId)).limit(1);

    if (!heat) {
      return null;
    }

    return {
      winnerDestinationHeatId: heat.winnerDestinationHeatId,
      loserDestinationHeatId: heat.loserDestinationHeatId,
    };
  }
}
