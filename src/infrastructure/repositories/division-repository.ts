import { eq } from "drizzle-orm";
import type { DivisionRepository } from "../../domain/contest/repositories.js";
import type {
  CreateDivisionInput,
  Division,
  UpdateDivisionInput,
} from "../../domain/contest/types.js";
import { getDb } from "../db/index.js";
import { divisions } from "../db/schema.js";

export class DivisionRepositoryImpl implements DivisionRepository {
  private mapDbDivisionToDivision(division: typeof divisions.$inferSelect): Division {
    return {
      id: division.id,
      contestId: division.contestId,
      name: division.name,
      category: division.category as Division["category"],
      createdAt: division.createdAt,
      updatedAt: division.updatedAt,
    };
  }

  async createDivision(input: CreateDivisionInput): Promise<Division> {
    const db = await getDb();
    const [newDivision] = await db
      .insert(divisions)
      .values({
        contestId: input.contestId,
        name: input.name,
        category: input.category,
      })
      .returning();

    return this.mapDbDivisionToDivision(newDivision);
  }

  async getDivisionById(id: string): Promise<Division | null> {
    const db = await getDb();
    const [division] = await db.select().from(divisions).where(eq(divisions.id, id)).limit(1);

    if (!division) {
      return null;
    }

    return this.mapDbDivisionToDivision(division);
  }

  async getDivisionsByContestId(contestId: string): Promise<Division[]> {
    const db = await getDb();
    const contestDivisions = await db
      .select()
      .from(divisions)
      .where(eq(divisions.contestId, contestId));

    return contestDivisions.map((division) => this.mapDbDivisionToDivision(division));
  }

  async getAllDivisions(): Promise<Division[]> {
    const db = await getDb();
    const allDivisions = await db.select().from(divisions);

    return allDivisions.map((division) => this.mapDbDivisionToDivision(division));
  }

  async updateDivision(id: string, updates: UpdateDivisionInput): Promise<Division> {
    const db = await getDb();
    const updateData: {
      contestId?: string;
      name?: string;
      category?: string;
      updatedAt: Date;
    } = {
      updatedAt: new Date(),
    };

    if (updates.contestId !== undefined) {
      updateData.contestId = updates.contestId;
    }
    if (updates.name !== undefined) {
      updateData.name = updates.name;
    }
    if (updates.category !== undefined) {
      updateData.category = updates.category;
    }

    const [updatedDivision] = await db
      .update(divisions)
      .set(updateData)
      .where(eq(divisions.id, id))
      .returning();

    return this.mapDbDivisionToDivision(updatedDivision);
  }

  async deleteDivision(id: string): Promise<void> {
    const db = await getDb();
    await db.delete(divisions).where(eq(divisions.id, id));
  }
}
