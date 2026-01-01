import { eq } from "drizzle-orm";
import type {
  CreateHeatInput,
  Heat,
  HeatRepository as IHeatRepository,
  UpdateHeatInput,
} from "../../domain/heat/repositories.js";
import { getDb } from "../db/index.js";
import { heats } from "../db/schema.js";

export class HeatRepositoryImpl implements IHeatRepository {
  private mapDbHeatToHeat(heat: typeof heats.$inferSelect): Heat {
    return {
      id: heat.id,
      heatId: heat.heatId,
      bracketId: heat.bracketId,
      riderIds: JSON.parse(heat.riderIds) as string[],
      wavesCounting: heat.wavesCounting,
      jumpsCounting: heat.jumpsCounting,
      createdAt: heat.createdAt,
      updatedAt: heat.updatedAt,
    };
  }

  async createHeat(input: CreateHeatInput): Promise<Heat> {
    const db = await getDb();
    const [newHeat] = await db
      .insert(heats)
      .values({
        heatId: input.heatId,
        bracketId: input.bracketId,
        riderIds: JSON.stringify(input.riderIds),
        wavesCounting: input.wavesCounting,
        jumpsCounting: input.jumpsCounting,
      })
      .returning();

    return this.mapDbHeatToHeat(newHeat);
  }

  async getHeatByHeatId(heatId: string): Promise<Heat | null> {
    const db = await getDb();
    const [heat] = await db.select().from(heats).where(eq(heats.heatId, heatId)).limit(1);

    if (!heat) {
      return null;
    }

    return this.mapDbHeatToHeat(heat);
  }

  async getHeatsByBracketId(bracketId: string): Promise<Heat[]> {
    const db = await getDb();
    const bracketHeats = await db.select().from(heats).where(eq(heats.bracketId, bracketId));

    return bracketHeats.map((heat) => this.mapDbHeatToHeat(heat));
  }

  async getAllHeats(): Promise<Heat[]> {
    const db = await getDb();
    const allHeats = await db.select().from(heats);

    return allHeats.map((heat) => this.mapDbHeatToHeat(heat));
  }

  async updateHeat(heatId: string, updates: UpdateHeatInput): Promise<Heat> {
    const db = await getDb();
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

    const [updatedHeat] = await db
      .update(heats)
      .set(updateData)
      .where(eq(heats.heatId, heatId))
      .returning();

    return this.mapDbHeatToHeat(updatedHeat);
  }

  async deleteHeat(heatId: string): Promise<void> {
    const db = await getDb();
    await db.delete(heats).where(eq(heats.heatId, heatId));
  }
}
