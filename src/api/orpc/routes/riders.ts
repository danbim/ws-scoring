import { ORPCError } from "@orpc/server";
import { z } from "zod";
import type { Rider } from "../../../domain/rider/types.js";
import { createRiderRepository } from "../../../infrastructure/repositories/index.js";
import {
  createRiderRequestSchema,
  riderResponseSchema,
  updateRiderRequestSchema,
} from "../../schemas.js";
import { adminProcedure, authedProcedure } from "../context.js";

function formatDate(date: Date | null): string | null {
  return date ? date.toISOString().split("T")[0] : null;
}

function formatRider(rider: Rider) {
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

export const listRiders = authedProcedure
  .input(z.object({ includeDeleted: z.boolean().optional() }))
  .output(z.object({ riders: z.array(riderResponseSchema) }))
  .handler(async ({ input }) => {
    const riderRepository = createRiderRepository();
    const riders = await riderRepository.getAllRiders(input.includeDeleted ?? false);
    return { riders: riders.map(formatRider) };
  });

export const getRider = authedProcedure
  .input(z.object({ riderId: z.string().uuid() }))
  .output(riderResponseSchema)
  .handler(async ({ input }) => {
    const riderRepository = createRiderRepository();
    const rider = await riderRepository.getRiderById(input.riderId);
    if (!rider) {
      throw new ORPCError("NOT_FOUND", { message: "Rider not found" });
    }
    return formatRider(rider);
  });

export const createRider = adminProcedure
  .input(createRiderRequestSchema)
  .output(riderResponseSchema)
  .handler(async ({ input }) => {
    const riderRepository = createRiderRepository();
    const rider = await riderRepository.createRider({
      firstName: input.firstName,
      lastName: input.lastName,
      country: input.country,
      sailNumber: input.sailNumber ?? null,
      email: input.email ?? null,
      dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : null,
    });
    return formatRider(rider);
  });

export const updateRider = adminProcedure
  .input(
    z.object({
      riderId: z.string().uuid(),
      data: updateRiderRequestSchema,
    })
  )
  .output(riderResponseSchema)
  .handler(async ({ input }) => {
    const riderRepository = createRiderRepository();
    const updates: Record<string, unknown> = {};
    if (input.data.firstName !== undefined) updates.firstName = input.data.firstName;
    if (input.data.lastName !== undefined) updates.lastName = input.data.lastName;
    if (input.data.country !== undefined) updates.country = input.data.country;
    if (input.data.sailNumber !== undefined) updates.sailNumber = input.data.sailNumber ?? null;
    if (input.data.email !== undefined) updates.email = input.data.email ?? null;
    if (input.data.dateOfBirth !== undefined)
      updates.dateOfBirth = input.data.dateOfBirth ? new Date(input.data.dateOfBirth) : null;

    const rider = await riderRepository.updateRider(input.riderId, updates);
    return formatRider(rider);
  });

export const deleteRider = adminProcedure
  .input(z.object({ riderId: z.string().uuid() }))
  .output(z.object({ message: z.string() }))
  .handler(async ({ input }) => {
    const riderRepository = createRiderRepository();
    await riderRepository.deleteRider(input.riderId);
    return { message: "Rider deleted successfully" };
  });
