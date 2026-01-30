import { eq } from "drizzle-orm";
import type { DivisionRepository } from "../../domain/contest/repositories.js";
import type {
  CreateDivisionInput,
  Division,
  UpdateDivisionInput,
} from "../../domain/contest/types.js";
import type { DbConnection } from "../db/index.js";
import { divisions } from "../db/schema.js";

export class DivisionRepositoryImpl implements DivisionRepository {
  constructor(private conn: DbConnection) {}

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
    const [newDivision] = await this.conn
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
    const [division] = await this.conn
      .select()
      .from(divisions)
      .where(eq(divisions.id, id))
      .limit(1);

    if (!division) {
      return null;
    }

    return this.mapDbDivisionToDivision(division);
  }

  async getDivisionsByContestId(contestId: string): Promise<Division[]> {
    const contestDivisions = await this.conn
      .select()
      .from(divisions)
      .where(eq(divisions.contestId, contestId));

    return contestDivisions.map((division) => this.mapDbDivisionToDivision(division));
  }

  async getAllDivisions(): Promise<Division[]> {
    const allDivisions = await this.conn.select().from(divisions);

    return allDivisions.map((division) => this.mapDbDivisionToDivision(division));
  }

  async updateDivision(id: string, updates: UpdateDivisionInput): Promise<Division> {
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

    const [updatedDivision] = await this.conn
      .update(divisions)
      .set(updateData)
      .where(eq(divisions.id, id))
      .returning();

    return this.mapDbDivisionToDivision(updatedDivision);
  }

  async deleteDivision(id: string): Promise<void> {
    await this.conn.delete(divisions).where(eq(divisions.id, id));
  }
}
