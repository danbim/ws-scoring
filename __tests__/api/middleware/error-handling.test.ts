import { describe, expect, it } from "bun:test";
import {
  getDomainErrorStatusCode,
  isBracketDomainError,
  isDomainError,
  isHeatDomainError,
  withErrorHandling,
} from "../../../src/api/middleware/error-handling.js";
import {
  BracketAlreadyExistsError,
  DivisionNotFoundError,
  InsufficientParticipantsError,
  TooManyParticipantsError,
} from "../../../src/domain/bracket/bracket-service.js";
import {
  HeatAlreadyExistsError,
  HeatDoesNotExistError,
  InvalidHeatRulesError,
  NonUniqueRiderIdsError,
  RiderAlreadyInHeatError,
  RiderNotInHeatError,
  ScoreMustBeInValidRangeError,
  ScoreNotFoundError,
  ScoreTypeMismatchError,
  ScoreUUIDAlreadyExistsError,
} from "../../../src/domain/heat/errors.js";

describe("error-handling middleware", () => {
  describe("isHeatDomainError", () => {
    it("should return true for heat domain errors", () => {
      expect(isHeatDomainError(new HeatAlreadyExistsError("test"))).toBe(true);
      expect(isHeatDomainError(new HeatDoesNotExistError("test"))).toBe(true);
      expect(isHeatDomainError(new NonUniqueRiderIdsError())).toBe(true);
      expect(isHeatDomainError(new RiderNotInHeatError("test", "test"))).toBe(true);
      expect(isHeatDomainError(new ScoreMustBeInValidRangeError(15))).toBe(true);
      expect(isHeatDomainError(new ScoreUUIDAlreadyExistsError("test"))).toBe(true);
      expect(isHeatDomainError(new InvalidHeatRulesError())).toBe(true);
      expect(isHeatDomainError(new RiderAlreadyInHeatError("test", "test"))).toBe(true);
      expect(isHeatDomainError(new ScoreNotFoundError("test"))).toBe(true);
      expect(isHeatDomainError(new ScoreTypeMismatchError("test", "wave", "jump"))).toBe(true);
    });

    it("should return false for non-heat errors", () => {
      expect(isHeatDomainError(new Error("generic error"))).toBe(false);
      expect(isHeatDomainError(new DivisionNotFoundError("test"))).toBe(false);
      expect(isHeatDomainError("not an error")).toBe(false);
      expect(isHeatDomainError(null)).toBe(false);
      expect(isHeatDomainError(undefined)).toBe(false);
    });
  });

  describe("isBracketDomainError", () => {
    it("should return true for bracket domain errors", () => {
      expect(isBracketDomainError(new BracketAlreadyExistsError("test"))).toBe(true);
      expect(isBracketDomainError(new DivisionNotFoundError("test"))).toBe(true);
      expect(isBracketDomainError(new InsufficientParticipantsError(1))).toBe(true);
      expect(isBracketDomainError(new TooManyParticipantsError(65))).toBe(true);
    });

    it("should return false for non-bracket errors", () => {
      expect(isBracketDomainError(new Error("generic error"))).toBe(false);
      expect(isBracketDomainError(new HeatAlreadyExistsError("test"))).toBe(false);
      expect(isBracketDomainError("not an error")).toBe(false);
      expect(isBracketDomainError(null)).toBe(false);
    });
  });

  describe("isDomainError", () => {
    it("should return true for any domain error", () => {
      expect(isDomainError(new HeatAlreadyExistsError("test"))).toBe(true);
      expect(isDomainError(new DivisionNotFoundError("test"))).toBe(true);
      expect(isDomainError(new BracketAlreadyExistsError("test"))).toBe(true);
    });

    it("should return false for non-domain errors", () => {
      expect(isDomainError(new Error("generic error"))).toBe(false);
      expect(isDomainError("not an error")).toBe(false);
    });
  });

  describe("getDomainErrorStatusCode", () => {
    it("should return 404 for DivisionNotFoundError", () => {
      const error = new DivisionNotFoundError("test-division");
      expect(getDomainErrorStatusCode(error)).toBe(404);
    });

    it("should return 404 for HeatDoesNotExistError", () => {
      const error = new HeatDoesNotExistError("test-heat");
      expect(getDomainErrorStatusCode(error)).toBe(404);
    });

    it("should return 404 for ScoreNotFoundError", () => {
      const error = new ScoreNotFoundError("test-score");
      expect(getDomainErrorStatusCode(error)).toBe(404);
    });

    it("should return 400 for heat domain errors", () => {
      expect(getDomainErrorStatusCode(new HeatAlreadyExistsError("test"))).toBe(400);
      expect(getDomainErrorStatusCode(new NonUniqueRiderIdsError())).toBe(400);
      expect(getDomainErrorStatusCode(new RiderNotInHeatError("test", "test"))).toBe(400);
      expect(getDomainErrorStatusCode(new ScoreMustBeInValidRangeError(15))).toBe(400);
      expect(getDomainErrorStatusCode(new ScoreUUIDAlreadyExistsError("test"))).toBe(400);
      expect(getDomainErrorStatusCode(new InvalidHeatRulesError())).toBe(400);
      expect(getDomainErrorStatusCode(new RiderAlreadyInHeatError("test", "test"))).toBe(400);
      expect(getDomainErrorStatusCode(new ScoreTypeMismatchError("test", "wave", "jump"))).toBe(
        400
      );
    });

    it("should return 400 for bracket domain errors (except DivisionNotFoundError)", () => {
      expect(getDomainErrorStatusCode(new BracketAlreadyExistsError("test"))).toBe(400);
      expect(getDomainErrorStatusCode(new InsufficientParticipantsError(1))).toBe(400);
      expect(getDomainErrorStatusCode(new TooManyParticipantsError(65))).toBe(400);
    });
  });

  describe("withErrorHandling", () => {
    it("should return response from successful handler", async () => {
      const handler = async () => {
        return new Response(JSON.stringify({ success: true }), { status: 200 });
      };

      const response = await withErrorHandling(handler);
      expect(response.status).toBe(200);

      const data = (await response.json()) as { success: boolean };
      expect(data.success).toBe(true);
    });

    it("should return 400 for heat domain errors", async () => {
      const handler = async () => {
        throw new HeatAlreadyExistsError("heat-123");
      };

      const response = await withErrorHandling(handler);
      expect(response.status).toBe(400);

      const data = (await response.json()) as { error: string };
      expect(data.error).toContain("heat-123");
    });

    it("should return 404 for DivisionNotFoundError", async () => {
      const handler = async () => {
        throw new DivisionNotFoundError("division-456");
      };

      const response = await withErrorHandling(handler);
      expect(response.status).toBe(404);

      const data = (await response.json()) as { error: string };
      expect(data.error).toContain("division-456");
    });

    it("should return 400 for bracket domain errors", async () => {
      const handler = async () => {
        throw new BracketAlreadyExistsError("bracket-789");
      };

      const response = await withErrorHandling(handler);
      expect(response.status).toBe(400);

      const data = (await response.json()) as { error: string };
      expect(data.error).toContain("bracket-789");
    });

    it("should return 500 for generic Error instances", async () => {
      const handler = async () => {
        throw new Error("Something went wrong");
      };

      const response = await withErrorHandling(handler);
      expect(response.status).toBe(500);

      const data = (await response.json()) as { error: string };
      expect(data.error).toBe("Something went wrong");
    });

    it("should return 500 for unknown error types", async () => {
      const handler = async () => {
        throw "string error" as any;
      };

      const response = await withErrorHandling(handler);
      expect(response.status).toBe(500);

      const data = (await response.json()) as { error: string };
      expect(data.error).toBe("Internal server error");
    });

    it("should log errors with context when provided", async () => {
      const consoleSpy = {
        errors: [] as unknown[],
        log: (...args: unknown[]) => consoleSpy.errors.push(args),
      };

      const originalConsoleError = console.error;
      console.error = consoleSpy.log;

      try {
        const handler = async () => {
          throw new Error("Test error");
        };

        await withErrorHandling(handler, "testHandler");

        expect(consoleSpy.errors.length).toBeGreaterThan(0);
        const errorMessage = String(consoleSpy.errors[0]);
        expect(errorMessage).toContain("testHandler");
      } finally {
        console.error = originalConsoleError;
      }
    });
  });
});
