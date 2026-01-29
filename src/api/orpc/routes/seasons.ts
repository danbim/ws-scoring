import { ORPCError } from "@orpc/server";
import { z } from "zod";
import type { Season } from "../../../domain/contest/types.js";
import { createSeasonRepository } from "../../../infrastructure/repositories/index.js";
import {
  createSeasonRequestSchema,
  seasonResponseSchema,
  updateSeasonRequestSchema,
} from "../../schemas.js";
import { adminProcedure, authedProcedure } from "../context.js";

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

function formatSeason(season: Season) {
  return {
    id: season.id,
    name: season.name,
    year: season.year,
    startDate: formatDate(season.startDate),
    endDate: formatDate(season.endDate),
    createdAt: season.createdAt.toISOString(),
    updatedAt: season.updatedAt.toISOString(),
  };
}

export const listSeasons = authedProcedure
  .output(z.object({ seasons: z.array(seasonResponseSchema) }))
  .handler(async () => {
    const seasonRepository = createSeasonRepository();
    const seasons = await seasonRepository.getAllSeasons();
    console.warn("returning", seasons.map(formatSeason));
    return { seasons: seasons.map(formatSeason) };
  });

export const getSeason = authedProcedure
  .input(z.object({ seasonId: z.string().uuid() }))
  .output(seasonResponseSchema)
  .handler(async ({ input }) => {
    const seasonRepository = createSeasonRepository();
    const season = await seasonRepository.getSeasonById(input.seasonId);
    if (!season) {
      throw new ORPCError("NOT_FOUND", { message: "Season not found" });
    }
    return formatSeason(season);
  });

export const createSeason = adminProcedure
  .input(createSeasonRequestSchema)
  .output(seasonResponseSchema)
  .handler(async ({ input }) => {
    const seasonRepository = createSeasonRepository();
    const season = await seasonRepository.createSeason({
      name: input.name,
      year: input.year,
      startDate: new Date(input.startDate),
      endDate: new Date(input.endDate),
    });
    return formatSeason(season);
  });

export const updateSeason = adminProcedure
  .input(
    z.object({
      seasonId: z.string().uuid(),
      data: updateSeasonRequestSchema,
    })
  )
  .output(seasonResponseSchema)
  .handler(async ({ input }) => {
    const seasonRepository = createSeasonRepository();
    const updates: Record<string, unknown> = {};
    if (input.data.name !== undefined) updates.name = input.data.name;
    if (input.data.year !== undefined) updates.year = input.data.year;
    if (input.data.startDate !== undefined) updates.startDate = new Date(input.data.startDate);
    if (input.data.endDate !== undefined) updates.endDate = new Date(input.data.endDate);

    const season = await seasonRepository.updateSeason(input.seasonId, updates);
    return formatSeason(season);
  });

export const deleteSeason = adminProcedure
  .input(z.object({ seasonId: z.string().uuid() }))
  .output(z.object({ message: z.string() }))
  .handler(async ({ input }) => {
    const seasonRepository = createSeasonRepository();
    await seasonRepository.deleteSeason(input.seasonId);
    return { message: "Season deleted successfully" };
  });
