import { eq } from "drizzle-orm";
import type { BracketRepository } from "../../domain/contest/repositories.js";
import type {
  Bracket,
  CreateBracketInput,
  UpdateBracketInput,
} from "../../domain/contest/types.js";
import { getDb } from "../db/index.js";
import { brackets } from "../db/schema.js";

export class BracketRepositoryImpl implements BracketRepository {
  private mapDbBracketToBracket(bracket: typeof brackets.$inferSelect): Bracket {
    return {
      id: bracket.id,
      divisionId: bracket.divisionId,
      name: bracket.name,
      format: bracket.format as Bracket["format"],
      status: bracket.status,
      createdAt: bracket.createdAt,
      updatedAt: bracket.updatedAt,
    };
  }

  async createBracket(input: CreateBracketInput): Promise<Bracket> {
    const db = await getDb();
    const [newBracket] = await db
      .insert(brackets)
      .values({
        divisionId: input.divisionId,
        name: input.name,
        format: input.format,
        status: input.status,
      })
      .returning();

    return this.mapDbBracketToBracket(newBracket);
  }

  async getBracketById(id: string): Promise<Bracket | null> {
    const db = await getDb();
    const [bracket] = await db.select().from(brackets).where(eq(brackets.id, id)).limit(1);

    if (!bracket) {
      return null;
    }

    return this.mapDbBracketToBracket(bracket);
  }

  async getBracketsByDivisionId(divisionId: string): Promise<Bracket[]> {
    const db = await getDb();
    const divisionBrackets = await db
      .select()
      .from(brackets)
      .where(eq(brackets.divisionId, divisionId));

    return divisionBrackets.map((bracket) => this.mapDbBracketToBracket(bracket));
  }

  async getAllBrackets(): Promise<Bracket[]> {
    const db = await getDb();
    const allBrackets = await db.select().from(brackets);

    return allBrackets.map((bracket) => this.mapDbBracketToBracket(bracket));
  }

  async updateBracket(id: string, updates: UpdateBracketInput): Promise<Bracket> {
    const db = await getDb();
    const updateData: {
      divisionId?: string;
      name?: string;
      format?: string;
      status?: string;
      updatedAt: Date;
    } = {
      updatedAt: new Date(),
    };

    if (updates.divisionId !== undefined) {
      updateData.divisionId = updates.divisionId;
    }
    if (updates.name !== undefined) {
      updateData.name = updates.name;
    }
    if (updates.format !== undefined) {
      updateData.format = updates.format;
    }
    if (updates.status !== undefined) {
      updateData.status = updates.status;
    }

    const [updatedBracket] = await db
      .update(brackets)
      .set(updateData)
      .where(eq(brackets.id, id))
      .returning();

    return this.mapDbBracketToBracket(updatedBracket);
  }

  async deleteBracket(id: string): Promise<void> {
    const db = await getDb();
    await db.delete(brackets).where(eq(brackets.id, id));
  }
}
