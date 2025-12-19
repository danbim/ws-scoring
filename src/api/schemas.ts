// Zod schemas for API request validation
import { z } from "zod";

export const createHeatRequestSchema = z.object({
  heatId: z.string().min(1, "Heat ID is required"),
  riderIds: z
    .array(z.string().min(1, "Rider ID cannot be empty"))
    .min(1, "At least one rider is required"),
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

// Type inference from schemas
export type CreateHeatRequest = z.infer<typeof createHeatRequestSchema>;
export type AddWaveScoreRequest = z.infer<typeof addWaveScoreRequestSchema>;
export type AddJumpScoreRequest = z.infer<typeof addJumpScoreRequestSchema>;
