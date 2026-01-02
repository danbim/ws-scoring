import { eq } from "drizzle-orm";
import type { SeasonRepository } from "../../domain/contest/repositories.js";
import type { CreateSeasonInput, Season, UpdateSeasonInput } from "../../domain/contest/types.js";
import { getDb } from "../db/index.js";
import { seasons } from "../db/schema.js";

export class SeasonRepositoryImpl implements SeasonRepository {
  private mapDbSeasonToSeason(season: typeof seasons.$inferSelect): Season {
    return {
      id: season.id,
      name: season.name,
      year: season.year,
      startDate: season.startDate,
      endDate: season.endDate,
      createdAt: season.createdAt,
      updatedAt: season.updatedAt,
    };
  }

  async createSeason(input: CreateSeasonInput): Promise<Season> {
    const db = await getDb();
    const [newSeason] = await db
      .insert(seasons)
      .values({
        name: input.name,
        year: input.year,
        startDate: input.startDate,
        endDate: input.endDate,
      })
      .returning();

    return this.mapDbSeasonToSeason(newSeason);
  }

  async getSeasonById(id: string): Promise<Season | null> {
    const db = await getDb();
    const [season] = await db.select().from(seasons).where(eq(seasons.id, id)).limit(1);

    if (!season) {
      return null;
    }

    return this.mapDbSeasonToSeason(season);
  }

  async getAllSeasons(): Promise<Season[]> {
    const db = await getDb();
    const allSeasons = await db.select().from(seasons);

    return allSeasons.map((season) => this.mapDbSeasonToSeason(season));
  }

  async updateSeason(id: string, updates: UpdateSeasonInput): Promise<Season> {
    const db = await getDb();
    const updateData: {
      name?: string;
      year?: number;
      startDate?: Date;
      endDate?: Date;
      updatedAt: Date;
    } = {
      updatedAt: new Date(),
    };

    if (updates.name !== undefined) {
      updateData.name = updates.name;
    }
    if (updates.year !== undefined) {
      updateData.year = updates.year;
    }
    if (updates.startDate !== undefined) {
      updateData.startDate = updates.startDate;
    }
    if (updates.endDate !== undefined) {
      updateData.endDate = updates.endDate;
    }

    const [updatedSeason] = await db
      .update(seasons)
      .set(updateData)
      .where(eq(seasons.id, id))
      .returning();

    return this.mapDbSeasonToSeason(updatedSeason);
  }

  async deleteSeason(id: string): Promise<void> {
    const db = await getDb();
    await db.delete(seasons).where(eq(seasons.id, id));
  }
}
