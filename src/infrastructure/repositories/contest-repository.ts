import { eq } from "drizzle-orm";
import type { ContestRepository } from "../../domain/contest/repositories.js";
import type {
  Contest,
  CreateContestInput,
  UpdateContestInput,
} from "../../domain/contest/types.js";
import { getDb } from "../db/index.js";
import { contests } from "../db/schema.js";

export class ContestRepositoryImpl implements ContestRepository {
  private mapDbContestToContest(contest: typeof contests.$inferSelect): Contest {
    return {
      id: contest.id,
      seasonId: contest.seasonId,
      name: contest.name,
      location: contest.location,
      startDate: contest.startDate,
      endDate: contest.endDate,
      status: contest.status as Contest["status"],
      createdAt: contest.createdAt,
      updatedAt: contest.updatedAt,
    };
  }

  async createContest(input: CreateContestInput): Promise<Contest> {
    const db = await getDb();
    const [newContest] = await db
      .insert(contests)
      .values({
        seasonId: input.seasonId,
        name: input.name,
        location: input.location,
        startDate: input.startDate,
        endDate: input.endDate,
        status: input.status,
      })
      .returning();

    return this.mapDbContestToContest(newContest);
  }

  async getContestById(id: string): Promise<Contest | null> {
    const db = await getDb();
    const [contest] = await db.select().from(contests).where(eq(contests.id, id)).limit(1);

    if (!contest) {
      return null;
    }

    return this.mapDbContestToContest(contest);
  }

  async getContestsBySeasonId(seasonId: string): Promise<Contest[]> {
    const db = await getDb();
    const seasonContests = await db.select().from(contests).where(eq(contests.seasonId, seasonId));

    return seasonContests.map((contest) => this.mapDbContestToContest(contest));
  }

  async getAllContests(): Promise<Contest[]> {
    const db = await getDb();
    const allContests = await db.select().from(contests);

    return allContests.map((contest) => this.mapDbContestToContest(contest));
  }

  async updateContest(id: string, updates: UpdateContestInput): Promise<Contest> {
    const db = await getDb();
    const updateData: {
      seasonId?: string;
      name?: string;
      location?: string;
      startDate?: Date;
      endDate?: Date;
      status?: string;
      updatedAt: Date;
    } = {
      updatedAt: new Date(),
    };

    if (updates.seasonId !== undefined) {
      updateData.seasonId = updates.seasonId;
    }
    if (updates.name !== undefined) {
      updateData.name = updates.name;
    }
    if (updates.location !== undefined) {
      updateData.location = updates.location;
    }
    if (updates.startDate !== undefined) {
      updateData.startDate = updates.startDate;
    }
    if (updates.endDate !== undefined) {
      updateData.endDate = updates.endDate;
    }
    if (updates.status !== undefined) {
      updateData.status = updates.status;
    }

    const [updatedContest] = await db
      .update(contests)
      .set(updateData)
      .where(eq(contests.id, id))
      .returning();

    return this.mapDbContestToContest(updatedContest);
  }

  async deleteContest(id: string): Promise<void> {
    const db = await getDb();
    await db.delete(contests).where(eq(contests.id, id));
  }
}
