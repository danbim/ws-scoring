import { ORPCError } from "@orpc/server";
import { z } from "zod";
import { getDb } from "../../../infrastructure/db/index.js";
import { createDivisionParticipantRepository } from "../../../infrastructure/repositories/index.js";
import { riderResponseSchema } from "../../schemas.js";
import { adminProcedure, authedProcedure } from "../context.js";

function formatDate(date: Date | null): string | null {
  return date ? date.toISOString().split("T")[0] : null;
}

function formatParticipant(rider: {
  id: string;
  firstName: string;
  lastName: string;
  country: string;
  sailNumber: string | null;
  email: string | null;
  dateOfBirth: Date | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: rider.id,
    firstName: rider.firstName,
    lastName: rider.lastName,
    country: rider.country,
    sailNumber: rider.sailNumber,
    email: rider.email,
    dateOfBirth: formatDate(rider.dateOfBirth),
    deletedAt: rider.deletedAt?.toISOString() ?? null,
    createdAt: rider.createdAt.toISOString(),
    updatedAt: rider.updatedAt.toISOString(),
  };
}

export const listParticipants = authedProcedure
  .input(z.object({ divisionId: z.string().uuid() }))
  .output(z.object({ riders: z.array(riderResponseSchema) }))
  .handler(async ({ input }) => {
    const db = await getDb();
    const participantRepository = createDivisionParticipantRepository(db);
    const riders = await participantRepository.getParticipantsByDivisionId(input.divisionId);
    return {
      riders: riders.map(formatParticipant),
    };
  });

export const addParticipant = adminProcedure
  .input(z.object({ divisionId: z.string().uuid(), riderId: z.string().uuid() }))
  .output(
    z.object({
      id: z.string(),
      divisionId: z.string(),
      riderId: z.string(),
      createdAt: z.string(),
    })
  )
  .handler(async ({ input }) => {
    const db = await getDb();
    const participantRepository = createDivisionParticipantRepository(db);

    const isParticipant = await participantRepository.isParticipant(
      input.divisionId,
      input.riderId
    );
    if (isParticipant) {
      throw new ORPCError("BAD_REQUEST", {
        message: "Rider is already a participant in this division",
      });
    }

    const participant = await participantRepository.addParticipant(input.divisionId, input.riderId);
    return {
      id: participant.id,
      divisionId: participant.divisionId,
      riderId: participant.riderId,
      createdAt: participant.createdAt.toISOString(),
    };
  });

export const removeParticipant = adminProcedure
  .input(z.object({ divisionId: z.string().uuid(), riderId: z.string().uuid() }))
  .output(z.object({ message: z.string() }))
  .handler(async ({ input }) => {
    const db = await getDb();
    const participantRepository = createDivisionParticipantRepository(db);
    await participantRepository.removeParticipant(input.divisionId, input.riderId);
    return { message: "Participant removed successfully" };
  });
