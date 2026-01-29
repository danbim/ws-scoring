import { ORPCError } from "@orpc/server";
import { z } from "zod";
import type { Contest } from "../../../domain/contest/types.js";
import { createContestRepository } from "../../../infrastructure/repositories/index.js";
import {
  contestResponseSchema,
  createContestRequestSchema,
  updateContestRequestSchema,
} from "../../schemas.js";
import { adminProcedure, authedProcedure } from "../context.js";

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

function formatContest(contest: Contest) {
  return {
    id: contest.id,
    seasonId: contest.seasonId,
    name: contest.name,
    location: contest.location,
    startDate: formatDate(contest.startDate),
    endDate: formatDate(contest.endDate),
    status: contest.status,
    createdAt: contest.createdAt.toISOString(),
    updatedAt: contest.updatedAt.toISOString(),
  };
}

export const listContests = authedProcedure
  .input(z.object({ seasonId: z.string().uuid().optional() }))
  .output(z.object({ contests: z.array(contestResponseSchema) }))
  .handler(async ({ input }) => {
    const contestRepository = createContestRepository();
    const contests = input.seasonId
      ? await contestRepository.getContestsBySeasonId(input.seasonId)
      : await contestRepository.getAllContests();
    return { contests: contests.map(formatContest) };
  });

export const getContest = authedProcedure
  .input(z.object({ contestId: z.string().uuid() }))
  .output(contestResponseSchema)
  .handler(async ({ input }) => {
    const contestRepository = createContestRepository();
    const contest = await contestRepository.getContestById(input.contestId);
    if (!contest) {
      throw new ORPCError("NOT_FOUND", { message: "Contest not found" });
    }
    return formatContest(contest);
  });

export const createContest = adminProcedure
  .input(createContestRequestSchema)
  .output(contestResponseSchema)
  .handler(async ({ input }) => {
    const contestRepository = createContestRepository();
    const contest = await contestRepository.createContest({
      seasonId: input.seasonId,
      name: input.name,
      location: input.location,
      startDate: new Date(input.startDate),
      endDate: new Date(input.endDate),
      status: input.status,
    });
    return formatContest(contest);
  });

export const updateContest = adminProcedure
  .input(
    z.object({
      contestId: z.string().uuid(),
      data: updateContestRequestSchema,
    })
  )
  .output(contestResponseSchema)
  .handler(async ({ input }) => {
    const contestRepository = createContestRepository();
    const updates: Record<string, unknown> = {};
    if (input.data.seasonId !== undefined) updates.seasonId = input.data.seasonId;
    if (input.data.name !== undefined) updates.name = input.data.name;
    if (input.data.location !== undefined) updates.location = input.data.location;
    if (input.data.startDate !== undefined) updates.startDate = new Date(input.data.startDate);
    if (input.data.endDate !== undefined) updates.endDate = new Date(input.data.endDate);
    if (input.data.status !== undefined) updates.status = input.data.status;

    const contest = await contestRepository.updateContest(input.contestId, updates);
    return formatContest(contest);
  });

export const deleteContest = adminProcedure
  .input(z.object({ contestId: z.string().uuid() }))
  .output(z.object({ message: z.string() }))
  .handler(async ({ input }) => {
    const contestRepository = createContestRepository();
    await contestRepository.deleteContest(input.contestId);
    return { message: "Contest deleted successfully" };
  });
