// REST API route handlers for seasons, contests, divisions, and brackets

import type {
  CreateBracketInput,
  CreateContestInput,
  CreateDivisionInput,
  CreateSeasonInput,
  UpdateBracketInput,
  UpdateContestInput,
  UpdateDivisionInput,
  UpdateSeasonInput,
} from "../../domain/contest/types.js";
import {
  createBracketRepository,
  createContestRepository,
  createDivisionRepository,
  createSeasonRepository,
} from "../../infrastructure/repositories/index.js";
import { createErrorResponse, createSuccessResponse } from "../helpers.js";
import {
  createBracketRequestSchema,
  createContestRequestSchema,
  createDivisionRequestSchema,
  createSeasonRequestSchema,
  updateBracketRequestSchema,
  updateContestRequestSchema,
  updateDivisionRequestSchema,
  updateSeasonRequestSchema,
} from "../schemas.js";

// Helper to parse date strings to Date objects
function parseDate(dateString: string): Date {
  return new Date(dateString);
}

// Helper to format Date to ISO string
function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

// Seasons
export async function handleCreateSeason(request: Request): Promise<Response> {
  try {
    const body = await request.json();
    const validationResult = createSeasonRequestSchema.safeParse(body);

    if (!validationResult.success) {
      const errors = validationResult.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join(", ");
      return createErrorResponse(`Validation error: ${errors}`, 400);
    }

    const data = validationResult.data;
    const seasonRepository = createSeasonRepository();

    const input: CreateSeasonInput = {
      name: data.name,
      year: data.year,
      startDate: parseDate(data.startDate),
      endDate: parseDate(data.endDate),
    };

    const season = await seasonRepository.createSeason(input);

    return createSuccessResponse({
      id: season.id,
      name: season.name,
      year: season.year,
      startDate: formatDate(season.startDate),
      endDate: formatDate(season.endDate),
      createdAt: season.createdAt.toISOString(),
      updatedAt: season.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("Error creating season:", error);
    return createErrorResponse(
      error instanceof Error ? error.message : "Internal server error",
      500
    );
  }
}

export async function handleGetSeason(seasonId: string): Promise<Response> {
  try {
    const seasonRepository = createSeasonRepository();
    const season = await seasonRepository.getSeasonById(seasonId);

    if (!season) {
      return createErrorResponse("Season not found", 404);
    }

    return createSuccessResponse({
      id: season.id,
      name: season.name,
      year: season.year,
      startDate: formatDate(season.startDate),
      endDate: formatDate(season.endDate),
      createdAt: season.createdAt.toISOString(),
      updatedAt: season.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("Error getting season:", error);
    return createErrorResponse("Internal server error", 500);
  }
}

export async function handleListSeasons(): Promise<Response> {
  try {
    const seasonRepository = createSeasonRepository();
    const seasons = await seasonRepository.getAllSeasons();

    return createSuccessResponse({
      seasons: seasons.map((season) => ({
        id: season.id,
        name: season.name,
        year: season.year,
        startDate: formatDate(season.startDate),
        endDate: formatDate(season.endDate),
        createdAt: season.createdAt.toISOString(),
        updatedAt: season.updatedAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("Error listing seasons:", error);
    return createErrorResponse("Internal server error", 500);
  }
}

export async function handleUpdateSeason(seasonId: string, request: Request): Promise<Response> {
  try {
    const body = await request.json();
    const validationResult = updateSeasonRequestSchema.safeParse(body);

    if (!validationResult.success) {
      const errors = validationResult.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join(", ");
      return createErrorResponse(`Validation error: ${errors}`, 400);
    }

    const data = validationResult.data;
    const seasonRepository = createSeasonRepository();

    const updates: UpdateSeasonInput = {};
    if (data.name !== undefined) updates.name = data.name;
    if (data.year !== undefined) updates.year = data.year;
    if (data.startDate !== undefined) updates.startDate = parseDate(data.startDate);
    if (data.endDate !== undefined) updates.endDate = parseDate(data.endDate);

    const season = await seasonRepository.updateSeason(seasonId, updates);

    return createSuccessResponse({
      id: season.id,
      name: season.name,
      year: season.year,
      startDate: formatDate(season.startDate),
      endDate: formatDate(season.endDate),
      createdAt: season.createdAt.toISOString(),
      updatedAt: season.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("Error updating season:", error);
    return createErrorResponse("Internal server error", 500);
  }
}

export async function handleDeleteSeason(seasonId: string): Promise<Response> {
  try {
    const seasonRepository = createSeasonRepository();
    await seasonRepository.deleteSeason(seasonId);

    return createSuccessResponse({ message: "Season deleted successfully" });
  } catch (error) {
    console.error("Error deleting season:", error);
    return createErrorResponse("Internal server error", 500);
  }
}

// Contests
export async function handleCreateContest(request: Request): Promise<Response> {
  try {
    const body = await request.json();
    const validationResult = createContestRequestSchema.safeParse(body);

    if (!validationResult.success) {
      const errors = validationResult.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join(", ");
      return createErrorResponse(`Validation error: ${errors}`, 400);
    }

    const data = validationResult.data;
    const contestRepository = createContestRepository();

    const input: CreateContestInput = {
      seasonId: data.seasonId,
      name: data.name,
      location: data.location,
      startDate: parseDate(data.startDate),
      endDate: parseDate(data.endDate),
      status: data.status,
    };

    const contest = await contestRepository.createContest(input);

    return createSuccessResponse({
      id: contest.id,
      seasonId: contest.seasonId,
      name: contest.name,
      location: contest.location,
      startDate: formatDate(contest.startDate),
      endDate: formatDate(contest.endDate),
      status: contest.status,
      createdAt: contest.createdAt.toISOString(),
      updatedAt: contest.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("Error creating contest:", error);
    return createErrorResponse(
      error instanceof Error ? error.message : "Internal server error",
      500
    );
  }
}

export async function handleGetContest(contestId: string): Promise<Response> {
  try {
    const contestRepository = createContestRepository();
    const contest = await contestRepository.getContestById(contestId);

    if (!contest) {
      return createErrorResponse("Contest not found", 404);
    }

    return createSuccessResponse({
      id: contest.id,
      seasonId: contest.seasonId,
      name: contest.name,
      location: contest.location,
      startDate: formatDate(contest.startDate),
      endDate: formatDate(contest.endDate),
      status: contest.status,
      createdAt: contest.createdAt.toISOString(),
      updatedAt: contest.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("Error getting contest:", error);
    return createErrorResponse("Internal server error", 500);
  }
}

export async function handleListContests(seasonId?: string): Promise<Response> {
  try {
    const contestRepository = createContestRepository();
    const contests = seasonId
      ? await contestRepository.getContestsBySeasonId(seasonId)
      : await contestRepository.getAllContests();

    return createSuccessResponse({
      contests: contests.map((contest) => ({
        id: contest.id,
        seasonId: contest.seasonId,
        name: contest.name,
        location: contest.location,
        startDate: formatDate(contest.startDate),
        endDate: formatDate(contest.endDate),
        status: contest.status,
        createdAt: contest.createdAt.toISOString(),
        updatedAt: contest.updatedAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("Error listing contests:", error);
    return createErrorResponse("Internal server error", 500);
  }
}

export async function handleUpdateContest(contestId: string, request: Request): Promise<Response> {
  try {
    const body = await request.json();
    const validationResult = updateContestRequestSchema.safeParse(body);

    if (!validationResult.success) {
      const errors = validationResult.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join(", ");
      return createErrorResponse(`Validation error: ${errors}`, 400);
    }

    const data = validationResult.data;
    const contestRepository = createContestRepository();

    const updates: UpdateContestInput = {};
    if (data.seasonId !== undefined) updates.seasonId = data.seasonId;
    if (data.name !== undefined) updates.name = data.name;
    if (data.location !== undefined) updates.location = data.location;
    if (data.startDate !== undefined) updates.startDate = parseDate(data.startDate);
    if (data.endDate !== undefined) updates.endDate = parseDate(data.endDate);
    if (data.status !== undefined) updates.status = data.status;

    const contest = await contestRepository.updateContest(contestId, updates);

    return createSuccessResponse({
      id: contest.id,
      seasonId: contest.seasonId,
      name: contest.name,
      location: contest.location,
      startDate: formatDate(contest.startDate),
      endDate: formatDate(contest.endDate),
      status: contest.status,
      createdAt: contest.createdAt.toISOString(),
      updatedAt: contest.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("Error updating contest:", error);
    return createErrorResponse("Internal server error", 500);
  }
}

export async function handleDeleteContest(contestId: string): Promise<Response> {
  try {
    const contestRepository = createContestRepository();
    await contestRepository.deleteContest(contestId);

    return createSuccessResponse({ message: "Contest deleted successfully" });
  } catch (error) {
    console.error("Error deleting contest:", error);
    return createErrorResponse("Internal server error", 500);
  }
}

// Divisions
export async function handleCreateDivision(request: Request): Promise<Response> {
  try {
    const body = await request.json();
    const validationResult = createDivisionRequestSchema.safeParse(body);

    if (!validationResult.success) {
      const errors = validationResult.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join(", ");
      return createErrorResponse(`Validation error: ${errors}`, 400);
    }

    const data = validationResult.data;
    const divisionRepository = createDivisionRepository();

    const input: CreateDivisionInput = {
      contestId: data.contestId,
      name: data.name,
      category: data.category,
    };

    const division = await divisionRepository.createDivision(input);

    return createSuccessResponse({
      id: division.id,
      contestId: division.contestId,
      name: division.name,
      category: division.category,
      createdAt: division.createdAt.toISOString(),
      updatedAt: division.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("Error creating division:", error);
    return createErrorResponse(
      error instanceof Error ? error.message : "Internal server error",
      500
    );
  }
}

export async function handleGetDivision(divisionId: string): Promise<Response> {
  try {
    const divisionRepository = createDivisionRepository();
    const division = await divisionRepository.getDivisionById(divisionId);

    if (!division) {
      return createErrorResponse("Division not found", 404);
    }

    return createSuccessResponse({
      id: division.id,
      contestId: division.contestId,
      name: division.name,
      category: division.category,
      createdAt: division.createdAt.toISOString(),
      updatedAt: division.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("Error getting division:", error);
    return createErrorResponse("Internal server error", 500);
  }
}

export async function handleListDivisions(contestId?: string): Promise<Response> {
  try {
    const divisionRepository = createDivisionRepository();
    const divisions = contestId
      ? await divisionRepository.getDivisionsByContestId(contestId)
      : await divisionRepository.getAllDivisions();

    return createSuccessResponse({
      divisions: divisions.map((division) => ({
        id: division.id,
        contestId: division.contestId,
        name: division.name,
        category: division.category,
        createdAt: division.createdAt.toISOString(),
        updatedAt: division.updatedAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("Error listing divisions:", error);
    return createErrorResponse("Internal server error", 500);
  }
}

export async function handleUpdateDivision(
  divisionId: string,
  request: Request
): Promise<Response> {
  try {
    const body = await request.json();
    const validationResult = updateDivisionRequestSchema.safeParse(body);

    if (!validationResult.success) {
      const errors = validationResult.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join(", ");
      return createErrorResponse(`Validation error: ${errors}`, 400);
    }

    const data = validationResult.data;
    const divisionRepository = createDivisionRepository();

    const updates: UpdateDivisionInput = {};
    if (data.contestId !== undefined) updates.contestId = data.contestId;
    if (data.name !== undefined) updates.name = data.name;
    if (data.category !== undefined) updates.category = data.category;

    const division = await divisionRepository.updateDivision(divisionId, updates);

    return createSuccessResponse({
      id: division.id,
      contestId: division.contestId,
      name: division.name,
      category: division.category,
      createdAt: division.createdAt.toISOString(),
      updatedAt: division.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("Error updating division:", error);
    return createErrorResponse("Internal server error", 500);
  }
}

export async function handleDeleteDivision(divisionId: string): Promise<Response> {
  try {
    const divisionRepository = createDivisionRepository();
    await divisionRepository.deleteDivision(divisionId);

    return createSuccessResponse({ message: "Division deleted successfully" });
  } catch (error) {
    console.error("Error deleting division:", error);
    return createErrorResponse("Internal server error", 500);
  }
}

// Brackets
export async function handleCreateBracket(request: Request): Promise<Response> {
  try {
    const body = await request.json();
    const validationResult = createBracketRequestSchema.safeParse(body);

    if (!validationResult.success) {
      const errors = validationResult.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join(", ");
      return createErrorResponse(`Validation error: ${errors}`, 400);
    }

    const data = validationResult.data;
    const bracketRepository = createBracketRepository();

    const input: CreateBracketInput = {
      divisionId: data.divisionId,
      name: data.name,
      format: data.format,
      status: data.status,
    };

    const bracket = await bracketRepository.createBracket(input);

    return createSuccessResponse({
      id: bracket.id,
      divisionId: bracket.divisionId,
      name: bracket.name,
      format: bracket.format,
      status: bracket.status,
      createdAt: bracket.createdAt.toISOString(),
      updatedAt: bracket.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("Error creating bracket:", error);
    return createErrorResponse(
      error instanceof Error ? error.message : "Internal server error",
      500
    );
  }
}

export async function handleGetBracket(bracketId: string): Promise<Response> {
  try {
    const bracketRepository = createBracketRepository();
    const bracket = await bracketRepository.getBracketById(bracketId);

    if (!bracket) {
      return createErrorResponse("Bracket not found", 404);
    }

    return createSuccessResponse({
      id: bracket.id,
      divisionId: bracket.divisionId,
      name: bracket.name,
      format: bracket.format,
      status: bracket.status,
      createdAt: bracket.createdAt.toISOString(),
      updatedAt: bracket.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("Error getting bracket:", error);
    return createErrorResponse("Internal server error", 500);
  }
}

export async function handleListBrackets(divisionId?: string): Promise<Response> {
  try {
    const bracketRepository = createBracketRepository();
    const brackets = divisionId
      ? await bracketRepository.getBracketsByDivisionId(divisionId)
      : await bracketRepository.getAllBrackets();

    return createSuccessResponse({
      brackets: brackets.map((bracket) => ({
        id: bracket.id,
        divisionId: bracket.divisionId,
        name: bracket.name,
        format: bracket.format,
        status: bracket.status,
        createdAt: bracket.createdAt.toISOString(),
        updatedAt: bracket.updatedAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("Error listing brackets:", error);
    return createErrorResponse("Internal server error", 500);
  }
}

export async function handleUpdateBracket(bracketId: string, request: Request): Promise<Response> {
  try {
    const body = await request.json();
    const validationResult = updateBracketRequestSchema.safeParse(body);

    if (!validationResult.success) {
      const errors = validationResult.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join(", ");
      return createErrorResponse(`Validation error: ${errors}`, 400);
    }

    const data = validationResult.data;
    const bracketRepository = createBracketRepository();

    const updates: UpdateBracketInput = {};
    if (data.divisionId !== undefined) updates.divisionId = data.divisionId;
    if (data.name !== undefined) updates.name = data.name;
    if (data.format !== undefined) updates.format = data.format;
    if (data.status !== undefined) updates.status = data.status;

    const bracket = await bracketRepository.updateBracket(bracketId, updates);

    return createSuccessResponse({
      id: bracket.id,
      divisionId: bracket.divisionId,
      name: bracket.name,
      format: bracket.format,
      status: bracket.status,
      createdAt: bracket.createdAt.toISOString(),
      updatedAt: bracket.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("Error updating bracket:", error);
    return createErrorResponse("Internal server error", 500);
  }
}

export async function handleDeleteBracket(bracketId: string): Promise<Response> {
  try {
    const bracketRepository = createBracketRepository();
    await bracketRepository.deleteBracket(bracketId);

    return createSuccessResponse({ message: "Bracket deleted successfully" });
  } catch (error) {
    console.error("Error deleting bracket:", error);
    return createErrorResponse("Internal server error", 500);
  }
}
