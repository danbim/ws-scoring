import { ORPCError } from "@orpc/server";
import { z } from "zod";
import type { Division } from "../../../domain/contest/types.js";
import { getDb } from "../../../infrastructure/db/index.js";
import { createDivisionRepository } from "../../../infrastructure/repositories/index.js";
import {
  createDivisionRequestSchema,
  divisionResponseSchema,
  updateDivisionRequestSchema,
} from "../../schemas.js";
import { adminProcedure, authedProcedure } from "../context.js";

function formatDivision(division: Division) {
  return {
    id: division.id,
    contestId: division.contestId,
    name: division.name,
    category: division.category,
    createdAt: division.createdAt.toISOString(),
    updatedAt: division.updatedAt.toISOString(),
  };
}

export const listDivisions = authedProcedure
  .input(z.object({ contestId: z.string().uuid().optional() }))
  .output(z.object({ divisions: z.array(divisionResponseSchema) }))
  .handler(async ({ input }) => {
    const db = await getDb();
    const divisionRepository = createDivisionRepository(db);
    const divisions = input.contestId
      ? await divisionRepository.getDivisionsByContestId(input.contestId)
      : await divisionRepository.getAllDivisions();
    return { divisions: divisions.map(formatDivision) };
  });

export const getDivision = authedProcedure
  .input(z.object({ divisionId: z.string().uuid() }))
  .output(divisionResponseSchema)
  .handler(async ({ input }) => {
    const db = await getDb();
    const divisionRepository = createDivisionRepository(db);
    const division = await divisionRepository.getDivisionById(input.divisionId);
    if (!division) {
      throw new ORPCError("NOT_FOUND", { message: "Division not found" });
    }
    return formatDivision(division);
  });

export const createDivision = adminProcedure
  .input(createDivisionRequestSchema)
  .output(divisionResponseSchema)
  .handler(async ({ input }) => {
    const db = await getDb();
    const divisionRepository = createDivisionRepository(db);
    const division = await divisionRepository.createDivision({
      contestId: input.contestId,
      name: input.name,
      category: input.category,
    });
    return formatDivision(division);
  });

export const updateDivision = adminProcedure
  .input(
    z.object({
      divisionId: z.string().uuid(),
      data: updateDivisionRequestSchema,
    })
  )
  .output(divisionResponseSchema)
  .handler(async ({ input }) => {
    const db = await getDb();
    const divisionRepository = createDivisionRepository(db);
    const updates: Record<string, unknown> = {};
    if (input.data.contestId !== undefined) updates.contestId = input.data.contestId;
    if (input.data.name !== undefined) updates.name = input.data.name;
    if (input.data.category !== undefined) updates.category = input.data.category;

    const division = await divisionRepository.updateDivision(input.divisionId, updates);
    return formatDivision(division);
  });

export const deleteDivision = adminProcedure
  .input(z.object({ divisionId: z.string().uuid() }))
  .output(z.object({ message: z.string() }))
  .handler(async ({ input }) => {
    const db = await getDb();
    const divisionRepository = createDivisionRepository(db);
    await divisionRepository.deleteDivision(input.divisionId);
    return { message: "Division deleted successfully" };
  });
