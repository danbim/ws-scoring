import { ORPCError } from "@orpc/server";
import { z } from "zod";
import {
  BracketAlreadyExistsError,
  DivisionNotFoundError,
  generateBracketForDivision,
  InsufficientParticipantsError,
} from "../../../domain/bracket/bracket-service.js";
import type { Bracket } from "../../../domain/contest/types.js";
import {
  createBracketRepository,
  createDivisionParticipantRepository,
  createDivisionRepository,
  createHeatRepository,
} from "../../../infrastructure/repositories/index.js";
import {
  bracketResponseSchema,
  createBracketRequestSchema,
  updateBracketRequestSchema,
} from "../../schemas.js";
import { adminProcedure, authedProcedure } from "../context.js";

function formatBracket(bracket: Bracket) {
  return {
    id: bracket.id,
    divisionId: bracket.divisionId,
    name: bracket.name,
    format: bracket.format,
    status: bracket.status,
    createdAt: bracket.createdAt.toISOString(),
    updatedAt: bracket.updatedAt.toISOString(),
  };
}

export const listBrackets = authedProcedure
  .input(z.object({ divisionId: z.string().uuid().optional() }))
  .output(z.object({ brackets: z.array(bracketResponseSchema) }))
  .handler(async ({ input }) => {
    const bracketRepository = createBracketRepository();
    const brackets = input.divisionId
      ? await bracketRepository.getBracketsByDivisionId(input.divisionId)
      : await bracketRepository.getAllBrackets();
    return { brackets: brackets.map(formatBracket) };
  });

const bracketWithHeatsResponseSchema = z.object({
  bracket: bracketResponseSchema,
  rounds: z.array(
    z.object({
      roundNumber: z.number(),
      roundName: z.string(),
      heats: z.array(
        z.object({
          heatId: z.string(),
          position: z.string(),
          riderIds: z.array(z.string()),
          winnerDestinationHeatId: z.string().nullable(),
          loserDestinationHeatId: z.string().nullable(),
        })
      ),
    })
  ),
});

export const getBracket = authedProcedure
  .input(z.object({ bracketId: z.string().uuid() }))
  .output(bracketResponseSchema)
  .handler(async ({ input }) => {
    const bracketRepository = createBracketRepository();
    const bracket = await bracketRepository.getBracketById(input.bracketId);
    if (!bracket) {
      throw new ORPCError("NOT_FOUND", { message: "Bracket not found" });
    }
    return formatBracket(bracket);
  });

export const getWithHeats = authedProcedure
  .input(z.object({ bracketId: z.string().uuid() }))
  .output(bracketWithHeatsResponseSchema)
  .handler(async ({ input }) => {
    const bracketRepository = createBracketRepository();
    const result = await bracketRepository.getBracketWithHeats(input.bracketId);
    if (!result) {
      throw new ORPCError("NOT_FOUND", { message: "Bracket not found" });
    }
    return {
      bracket: formatBracket(result.bracket),
      rounds: result.rounds,
    };
  });

export const createBracket = adminProcedure
  .input(createBracketRequestSchema)
  .output(bracketResponseSchema)
  .handler(async ({ input }) => {
    const bracketRepository = createBracketRepository();
    const bracket = await bracketRepository.createBracket({
      divisionId: input.divisionId,
      name: input.name,
      format: input.format,
      status: input.status,
    });
    return formatBracket(bracket);
  });

export const updateBracket = adminProcedure
  .input(
    z.object({
      bracketId: z.string().uuid(),
      data: updateBracketRequestSchema,
    })
  )
  .output(bracketResponseSchema)
  .handler(async ({ input }) => {
    const bracketRepository = createBracketRepository();
    const updates: Record<string, unknown> = {};
    if (input.data.divisionId !== undefined) updates.divisionId = input.data.divisionId;
    if (input.data.name !== undefined) updates.name = input.data.name;
    if (input.data.format !== undefined) updates.format = input.data.format;
    if (input.data.status !== undefined) updates.status = input.data.status;

    const bracket = await bracketRepository.updateBracket(input.bracketId, updates);
    return formatBracket(bracket);
  });

export const deleteBracket = adminProcedure
  .input(z.object({ bracketId: z.string().uuid() }))
  .output(z.object({ message: z.string() }))
  .handler(async ({ input }) => {
    const bracketRepository = createBracketRepository();
    await bracketRepository.deleteBracket(input.bracketId);
    return { message: "Bracket deleted successfully" };
  });

export const generate = adminProcedure
  .input(z.object({ divisionId: z.string().uuid(), format: z.literal("single_elimination") }))
  .output(z.object({ bracketId: z.string() }))
  .handler(async ({ input }) => {
    const divisionRepository = createDivisionRepository();
    const bracketRepository = createBracketRepository();
    const divisionParticipantRepository = createDivisionParticipantRepository();
    const heatRepository = createHeatRepository();

    try {
      const bracketId = await generateBracketForDivision(input.divisionId, {
        divisionRepository,
        bracketRepository,
        divisionParticipantRepository,
        heatRepository,
      });
      return { bracketId };
    } catch (error) {
      if (error instanceof DivisionNotFoundError) {
        throw new ORPCError("NOT_FOUND", { message: error.message });
      }
      if (error instanceof BracketAlreadyExistsError) {
        throw new ORPCError("BAD_REQUEST", { message: error.message });
      }
      if (error instanceof InsufficientParticipantsError) {
        throw new ORPCError("BAD_REQUEST", { message: error.message });
      }
      throw error;
    }
  });
