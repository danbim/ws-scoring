import { beforeEach, describe, expect, it } from "bun:test";
import {
  InvalidBracketCombinationError,
  validateDivisionBracketRules,
} from "../../../src/domain/contest/bracket-rules.js";
import type { BracketRepository } from "../../../src/domain/contest/repositories.js";
import {
  createBracketRepository,
  createContestRepository,
  createDivisionRepository,
  createSeasonRepository,
} from "../../../src/infrastructure/repositories/index.js";

describe("Bracket Rules Validation", () => {
  let bracketRepository: BracketRepository;
  let divisionId1: string;
  let divisionId2: string;

  beforeEach(async () => {
    // Create test data
    const seasonRepository = createSeasonRepository();
    const contestRepository = createContestRepository();
    const divisionRepository = createDivisionRepository();
    bracketRepository = createBracketRepository();

    // Clean up existing brackets
    const allBrackets = await bracketRepository.getAllBrackets();
    for (const bracket of allBrackets) {
      await bracketRepository.deleteBracket(bracket.id);
    }

    // Create season
    const season = await seasonRepository.createSeason({
      name: "Test Season",
      year: 2024,
      startDate: new Date("2024-01-01"),
      endDate: new Date("2024-12-31"),
    });

    // Create contest
    const contest = await contestRepository.createContest({
      seasonId: season.id,
      name: "Test Contest",
      location: "Test Location",
      startDate: new Date("2024-06-01"),
      endDate: new Date("2024-06-07"),
      status: "draft",
    });

    // Create divisions
    const division1 = await divisionRepository.createDivision({
      contestId: contest.id,
      name: "Division 1",
      category: "pro_men",
    });
    divisionId1 = division1.id;

    const division2 = await divisionRepository.createDivision({
      contestId: contest.id,
      name: "Division 2",
      category: "pro_women",
    });
    divisionId2 = division2.id;
  });

  describe("validateDivisionBracketRules", () => {
    it("should allow any format when division has no brackets", async () => {
      await validateDivisionBracketRules(divisionId1, "single_elimination", bracketRepository);
      await validateDivisionBracketRules(divisionId2, "dingle", bracketRepository);
      // If we get here, no error was thrown
      expect(true).toBe(true);
    });

    it("should allow single elimination bracket creation", async () => {
      await bracketRepository.createBracket({
        divisionId: divisionId1,
        name: "Single Bracket",
        format: "single_elimination",
        status: "draft",
      });

      // Should allow another single elimination (different division)
      await validateDivisionBracketRules(divisionId2, "single_elimination", bracketRepository);
      expect(true).toBe(true);
    });

    it("should allow double elimination after single elimination", async () => {
      await bracketRepository.createBracket({
        divisionId: divisionId1,
        name: "Single Bracket",
        format: "single_elimination",
        status: "draft",
      });

      await validateDivisionBracketRules(divisionId1, "double_elimination", bracketRepository);
      expect(true).toBe(true);
    });

    it("should reject double elimination without single elimination", async () => {
      await expect(
        validateDivisionBracketRules(divisionId1, "double_elimination", bracketRepository)
      ).rejects.toThrow(InvalidBracketCombinationError);
    });

    it("should reject dingle elimination when single elimination exists", async () => {
      await bracketRepository.createBracket({
        divisionId: divisionId1,
        name: "Single Bracket",
        format: "single_elimination",
        status: "draft",
      });

      await expect(
        validateDivisionBracketRules(divisionId1, "dingle", bracketRepository)
      ).rejects.toThrow(InvalidBracketCombinationError);
    });

    it("should reject dingle elimination when double elimination exists", async () => {
      await bracketRepository.createBracket({
        divisionId: divisionId1,
        name: "Single Bracket",
        format: "single_elimination",
        status: "draft",
      });

      await bracketRepository.createBracket({
        divisionId: divisionId1,
        name: "Double Bracket",
        format: "double_elimination",
        status: "draft",
      });

      await expect(
        validateDivisionBracketRules(divisionId1, "dingle", bracketRepository)
      ).rejects.toThrow(InvalidBracketCombinationError);
    });

    it("should reject single elimination when dingle elimination exists", async () => {
      await bracketRepository.createBracket({
        divisionId: divisionId1,
        name: "Dingle Bracket",
        format: "dingle",
        status: "draft",
      });

      await expect(
        validateDivisionBracketRules(divisionId1, "single_elimination", bracketRepository)
      ).rejects.toThrow(InvalidBracketCombinationError);
    });

    it("should reject double elimination when dingle elimination exists", async () => {
      await bracketRepository.createBracket({
        divisionId: divisionId1,
        name: "Dingle Bracket",
        format: "dingle",
        status: "draft",
      });

      await expect(
        validateDivisionBracketRules(divisionId1, "double_elimination", bracketRepository)
      ).rejects.toThrow(InvalidBracketCombinationError);
    });

    it("should allow multiple single elimination brackets in same division", async () => {
      await bracketRepository.createBracket({
        divisionId: divisionId1,
        name: "Single Bracket 1",
        format: "single_elimination",
        status: "draft",
      });

      // Should allow another single elimination in same division
      await validateDivisionBracketRules(divisionId1, "single_elimination", bracketRepository);
      expect(true).toBe(true);
    });

    it("should allow dingle elimination in different division", async () => {
      await bracketRepository.createBracket({
        divisionId: divisionId1,
        name: "Single Bracket",
        format: "single_elimination",
        status: "draft",
      });

      // Should allow dingle in different division
      await validateDivisionBracketRules(divisionId2, "dingle", bracketRepository);
      expect(true).toBe(true);
    });
  });
});
