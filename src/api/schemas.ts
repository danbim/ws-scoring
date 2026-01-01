// Zod schemas for API request validation
import { z } from "zod";

export const createHeatRequestSchema = z.object({
  heatId: z.string().min(1, "Heat ID is required"),
  riderIds: z.array(z.string().min(1, "Rider ID cannot be empty")),
  heatRules: z.object({
    wavesCounting: z
      .number()
      .int("Waves counting must be an integer")
      .positive("Waves counting must be positive"),
    jumpsCounting: z
      .number()
      .int("Jumps counting must be an integer")
      .positive("Jumps counting must be positive"),
  }),
  bracketId: z.string().uuid("Bracket ID must be a valid UUID"),
});

export const jumpTypeSchema = z.enum([
  "forward",
  "backloop",
  "doubleForward",
  "pushLoop",
  "pushForward",
  "tableTop",
  "cheeseRoll",
]);

export const addWaveScoreRequestSchema = z.object({
  heatId: z.string().min(1, "Heat ID is required"),
  scoreUUID: z.string().min(1, "Score UUID is required"),
  riderId: z.string().min(1, "Rider ID is required"),
  waveScore: z
    .number()
    .min(0, "Wave score must be between 0 and 10")
    .max(10, "Wave score must be between 0 and 10"),
});

export const addJumpScoreRequestSchema = z.object({
  heatId: z.string().min(1, "Heat ID is required"),
  scoreUUID: z.string().min(1, "Score UUID is required"),
  riderId: z.string().min(1, "Rider ID is required"),
  jumpScore: z
    .number()
    .min(0, "Jump score must be between 0 and 10")
    .max(10, "Jump score must be between 0 and 10"),
  jumpType: jumpTypeSchema,
});

export const loginRequestSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export const userResponseSchema = z.object({
  id: z.string().uuid(),
  username: z.string(),
  email: z.string().nullable(),
  role: z.enum(["judge", "head_judge", "administrator"]),
});

// Season schemas
export const createSeasonRequestSchema = z.object({
  name: z.string().min(1, "Name is required"),
  year: z.number().int("Year must be an integer").positive("Year must be positive"),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Start date must be in YYYY-MM-DD format"),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "End date must be in YYYY-MM-DD format"),
});

export const updateSeasonRequestSchema = createSeasonRequestSchema.partial();

export const seasonResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  year: z.number(),
  startDate: z.string(),
  endDate: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// Contest schemas
export const createContestRequestSchema = z.object({
  seasonId: z.string().uuid("Season ID must be a valid UUID"),
  name: z.string().min(1, "Name is required"),
  location: z.string().min(1, "Location is required"),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Start date must be in YYYY-MM-DD format"),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "End date must be in YYYY-MM-DD format"),
  status: z.enum(["draft", "scheduled", "in_progress", "completed", "cancelled"]),
});

export const updateContestRequestSchema = createContestRequestSchema.partial();

export const contestResponseSchema = z.object({
  id: z.string().uuid(),
  seasonId: z.string().uuid(),
  name: z.string(),
  location: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  status: z.enum(["draft", "scheduled", "in_progress", "completed", "cancelled"]),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// Division schemas
export const createDivisionRequestSchema = z.object({
  contestId: z.string().uuid("Contest ID must be a valid UUID"),
  name: z.string().min(1, "Name is required"),
  category: z.enum([
    "pro_men",
    "pro_women",
    "amateur_men",
    "amateur_women",
    "pro_youth",
    "amateur_youth",
    "pro_masters",
    "amateur_masters",
  ]),
});

export const updateDivisionRequestSchema = createDivisionRequestSchema.partial();

export const divisionResponseSchema = z.object({
  id: z.string().uuid(),
  contestId: z.string().uuid(),
  name: z.string(),
  category: z.enum([
    "pro_men",
    "pro_women",
    "amateur_men",
    "amateur_women",
    "pro_youth",
    "amateur_youth",
    "pro_masters",
    "amateur_masters",
  ]),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// Bracket schemas
export const createBracketRequestSchema = z.object({
  divisionId: z.string().uuid("Division ID must be a valid UUID"),
  name: z.string().min(1, "Name is required"),
  format: z.enum(["single_elimination", "double_elimination", "dingle"]),
  status: z.string().min(1, "Status is required"),
});

export const updateBracketRequestSchema = createBracketRequestSchema.partial();

export const bracketResponseSchema = z.object({
  id: z.string().uuid(),
  divisionId: z.string().uuid(),
  name: z.string(),
  format: z.enum(["single_elimination", "double_elimination", "dingle"]),
  status: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// Type inference from schemas
export type CreateHeatRequest = z.infer<typeof createHeatRequestSchema>;
export type AddWaveScoreRequest = z.infer<typeof addWaveScoreRequestSchema>;
export type AddJumpScoreRequest = z.infer<typeof addJumpScoreRequestSchema>;
export type LoginRequest = z.infer<typeof loginRequestSchema>;
export type UserResponse = z.infer<typeof userResponseSchema>;
export type CreateSeasonRequest = z.infer<typeof createSeasonRequestSchema>;
export type UpdateSeasonRequest = z.infer<typeof updateSeasonRequestSchema>;
export type SeasonResponse = z.infer<typeof seasonResponseSchema>;
export type CreateContestRequest = z.infer<typeof createContestRequestSchema>;
export type UpdateContestRequest = z.infer<typeof updateContestRequestSchema>;
export type ContestResponse = z.infer<typeof contestResponseSchema>;
export type CreateDivisionRequest = z.infer<typeof createDivisionRequestSchema>;
export type UpdateDivisionRequest = z.infer<typeof updateDivisionRequestSchema>;
export type DivisionResponse = z.infer<typeof divisionResponseSchema>;
export type CreateBracketRequest = z.infer<typeof createBracketRequestSchema>;
export type UpdateBracketRequest = z.infer<typeof updateBracketRequestSchema>;
export type BracketResponse = z.infer<typeof bracketResponseSchema>;
