import { and, eq, isNull, or } from "drizzle-orm";
import type {
  DivisionParticipantRepository,
  RiderRepository as IRiderRepository,
} from "../../domain/rider/repositories.js";
import type {
  CreateRiderInput,
  DivisionParticipant,
  Rider,
  UpdateRiderInput,
} from "../../domain/rider/types.js";
import { getDb } from "../db/index.js";
import { divisionParticipants, riders } from "../db/schema.js";

export class RiderRepositoryImpl implements IRiderRepository {
  private mapDbRiderToRider(rider: typeof riders.$inferSelect): Rider {
    return {
      id: rider.id,
      firstName: rider.firstName,
      lastName: rider.lastName,
      country: rider.country,
      sailNumber: rider.sailNumber,
      email: rider.email,
      dateOfBirth: rider.dateOfBirth,
      deletedAt: rider.deletedAt,
      createdAt: rider.createdAt,
      updatedAt: rider.updatedAt,
    };
  }

  async createRider(input: CreateRiderInput): Promise<Rider> {
    const db = await getDb();
    const [newRider] = await db
      .insert(riders)
      .values({
        firstName: input.firstName,
        lastName: input.lastName,
        country: input.country,
        sailNumber: input.sailNumber ?? null,
        email: input.email ?? null,
        dateOfBirth: input.dateOfBirth ?? null,
      })
      .returning();

    return this.mapDbRiderToRider(newRider);
  }

  async getRiderById(id: string, includeDeleted = false): Promise<Rider | null> {
    const db = await getDb();
    const conditions = includeDeleted
      ? eq(riders.id, id)
      : and(eq(riders.id, id), isNull(riders.deletedAt));

    const [rider] = await db.select().from(riders).where(conditions).limit(1);

    if (!rider) {
      return null;
    }

    return this.mapDbRiderToRider(rider);
  }

  async getAllRiders(includeDeleted = false): Promise<Rider[]> {
    const db = await getDb();
    const conditions = includeDeleted ? undefined : isNull(riders.deletedAt);

    const allRiders = conditions
      ? await db.select().from(riders).where(conditions)
      : await db.select().from(riders);

    return allRiders.map((rider) => this.mapDbRiderToRider(rider));
  }

  async updateRider(id: string, updates: UpdateRiderInput): Promise<Rider> {
    const db = await getDb();
    const updateData: {
      firstName?: string;
      lastName?: string;
      country?: string;
      sailNumber?: string | null;
      email?: string | null;
      dateOfBirth?: Date | null;
      updatedAt: Date;
    } = {
      updatedAt: new Date(),
    };

    if (updates.firstName !== undefined) {
      updateData.firstName = updates.firstName;
    }
    if (updates.lastName !== undefined) {
      updateData.lastName = updates.lastName;
    }
    if (updates.country !== undefined) {
      updateData.country = updates.country;
    }
    if (updates.sailNumber !== undefined) {
      updateData.sailNumber = updates.sailNumber;
    }
    if (updates.email !== undefined) {
      updateData.email = updates.email;
    }
    if (updates.dateOfBirth !== undefined) {
      updateData.dateOfBirth = updates.dateOfBirth;
    }

    const [updatedRider] = await db
      .update(riders)
      .set(updateData)
      .where(eq(riders.id, id))
      .returning();

    return this.mapDbRiderToRider(updatedRider);
  }

  async deleteRider(id: string): Promise<void> {
    const db = await getDb();
    await db
      .update(riders)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(riders.id, id));
  }

  async restoreRider(id: string): Promise<Rider> {
    const db = await getDb();
    const [restoredRider] = await db
      .update(riders)
      .set({ deletedAt: null, updatedAt: new Date() })
      .where(eq(riders.id, id))
      .returning();

    return this.mapDbRiderToRider(restoredRider);
  }
}

export class DivisionParticipantRepositoryImpl implements DivisionParticipantRepository {
  private mapDbParticipantToParticipant(
    participant: typeof divisionParticipants.$inferSelect
  ): DivisionParticipant {
    return {
      id: participant.id,
      divisionId: participant.divisionId,
      riderId: participant.riderId,
      createdAt: participant.createdAt,
    };
  }

  private mapDbRiderToRider(rider: typeof riders.$inferSelect): Rider {
    return {
      id: rider.id,
      firstName: rider.firstName,
      lastName: rider.lastName,
      country: rider.country,
      sailNumber: rider.sailNumber,
      email: rider.email,
      dateOfBirth: rider.dateOfBirth,
      deletedAt: rider.deletedAt,
      createdAt: rider.createdAt,
      updatedAt: rider.updatedAt,
    };
  }

  async addParticipant(divisionId: string, riderId: string): Promise<DivisionParticipant> {
    const db = await getDb();
    const [newParticipant] = await db
      .insert(divisionParticipants)
      .values({
        divisionId,
        riderId,
      })
      .returning();

    return this.mapDbParticipantToParticipant(newParticipant);
  }

  async removeParticipant(divisionId: string, riderId: string): Promise<void> {
    const db = await getDb();
    await db
      .delete(divisionParticipants)
      .where(
        and(
          eq(divisionParticipants.divisionId, divisionId),
          eq(divisionParticipants.riderId, riderId)
        )
      );
  }

  async getParticipantsByDivisionId(divisionId: string): Promise<Rider[]> {
    const db = await getDb();
    const participants = await db
      .select({
        rider: riders,
      })
      .from(divisionParticipants)
      .innerJoin(riders, eq(divisionParticipants.riderId, riders.id))
      .where(
        and(
          eq(divisionParticipants.divisionId, divisionId),
          isNull(riders.deletedAt) // Only include non-deleted riders
        )
      );

    return participants.map((p) => this.mapDbRiderToRider(p.rider));
  }

  async getDivisionsByRiderId(riderId: string): Promise<string[]> {
    const db = await getDb();
    const divisions = await db
      .select({ divisionId: divisionParticipants.divisionId })
      .from(divisionParticipants)
      .where(eq(divisionParticipants.riderId, riderId));

    return divisions.map((d) => d.divisionId);
  }

  async isParticipant(divisionId: string, riderId: string): Promise<boolean> {
    const db = await getDb();
    const [participant] = await db
      .select()
      .from(divisionParticipants)
      .where(
        and(
          eq(divisionParticipants.divisionId, divisionId),
          eq(divisionParticipants.riderId, riderId)
        )
      )
      .limit(1);

    return participant !== undefined;
  }
}
