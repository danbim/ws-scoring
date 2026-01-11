import { afterAll, afterEach, beforeAll, describe, expect, it } from "bun:test";
import {
  handleGenerateBracket,
  handleGetBracketWithHeats,
} from "../../src/api/routes/bracket-routes.js";
import {
  createContestRepository,
  createDivisionParticipantRepository,
  createDivisionRepository,
  createRiderRepository,
  createSeasonRepository,
} from "../../src/infrastructure/repositories/index.js";
import { clearTestData, setupTestDb, teardownTestDb } from "../test-db.js";

describe("Bracket API Routes", () => {
  const seasonRepo = createSeasonRepository();
  const contestRepo = createContestRepository();
  const divisionRepo = createDivisionRepository();
  const riderRepo = createRiderRepository();
  const participantRepo = createDivisionParticipantRepository();

  // Setup isolated PGlite database for this test file
  beforeAll(async () => {
    await setupTestDb();
  });

  // Cleanup PGlite database after all tests
  afterAll(async () => {
    await teardownTestDb();
  });

  afterEach(async () => {
    // Clear all data from previous test
    await clearTestData();
  });

  describe("handleGenerateBracket", () => {
    it("should generate bracket successfully for valid division with 8 riders", async () => {
      // Setup: Create division with 8 riders
      const season = await seasonRepo.createSeason({
        name: "Test Season",
        year: 2026,
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-12-31"),
      });

      const contest = await contestRepo.createContest({
        seasonId: season.id,
        name: "Test Contest",
        location: "Test Beach",
        startDate: new Date("2026-06-01"),
        endDate: new Date("2026-06-03"),
        status: "scheduled",
      });

      const division = await divisionRepo.createDivision({
        contestId: contest.id,
        name: "Men's Pro",
        category: "pro_men",
      });

      // Add 8 riders
      for (let i = 1; i <= 8; i++) {
        const rider = await riderRepo.createRider({
          firstName: `Rider`,
          lastName: `${i}`,
          country: "USA",
        });
        await participantRepo.addParticipant(division.id, rider.id);
      }

      // Execute: Generate bracket
      const request = new Request("http://localhost/api/divisions/123/brackets/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format: "single_elimination" }),
      });

      const response = await handleGenerateBracket(division.id, request);

      // Verify: Response
      expect(response.status).toBe(201);
      const result = await response.json();
      expect(result.bracketId).toBeDefined();
    });

    it("should return 404 for non-existent division", async () => {
      const nonExistentDivisionId = "00000000-0000-0000-0000-000000000000";

      const request = new Request("http://localhost/api/divisions/123/brackets/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format: "single_elimination" }),
      });

      const response = await handleGenerateBracket(nonExistentDivisionId, request);

      expect(response.status).toBe(404);
      const result = await response.json();
      expect(result.error).toContain("not found");
    });

    it("should return 400 if bracket already exists", async () => {
      // Setup: Create division with 2 riders
      const season = await seasonRepo.createSeason({
        name: "Test Season",
        year: 2026,
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-12-31"),
      });

      const contest = await contestRepo.createContest({
        seasonId: season.id,
        name: "Test Contest",
        location: "Test Beach",
        startDate: new Date("2026-06-01"),
        endDate: new Date("2026-06-03"),
        status: "scheduled",
      });

      const division = await divisionRepo.createDivision({
        contestId: contest.id,
        name: "Men's Pro",
        category: "pro_men",
      });

      for (let i = 1; i <= 2; i++) {
        const rider = await riderRepo.createRider({
          firstName: `Rider`,
          lastName: `${i}`,
          country: "USA",
        });
        await participantRepo.addParticipant(division.id, rider.id);
      }

      // Generate first bracket
      const request1 = new Request("http://localhost/api/divisions/123/brackets/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format: "single_elimination" }),
      });

      const firstResponse = await handleGenerateBracket(division.id, request1);
      expect(firstResponse.status).toBe(201);

      // Try to generate second bracket
      const request2 = new Request("http://localhost/api/divisions/123/brackets/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format: "single_elimination" }),
      });

      const secondResponse = await handleGenerateBracket(division.id, request2);

      expect(secondResponse.status).toBe(400);
      const result = await secondResponse.json();
      expect(result.error).toContain("already exists");
    });

    it("should return 400 for insufficient participants", async () => {
      // Setup: Create division with only 1 rider
      const season = await seasonRepo.createSeason({
        name: "Test Season",
        year: 2026,
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-12-31"),
      });

      const contest = await contestRepo.createContest({
        seasonId: season.id,
        name: "Test Contest",
        location: "Test Beach",
        startDate: new Date("2026-06-01"),
        endDate: new Date("2026-06-03"),
        status: "scheduled",
      });

      const division = await divisionRepo.createDivision({
        contestId: contest.id,
        name: "Men's Pro",
        category: "pro_men",
      });

      const rider = await riderRepo.createRider({
        firstName: "Solo",
        lastName: "Rider",
        country: "USA",
      });
      await participantRepo.addParticipant(division.id, rider.id);

      // Try to generate bracket
      const request = new Request("http://localhost/api/divisions/123/brackets/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format: "single_elimination" }),
      });

      const response = await handleGenerateBracket(division.id, request);

      expect(response.status).toBe(400);
      const result = await response.json();
      expect(result.error).toContain("participants");
    });

    it("should validate format is single_elimination", async () => {
      // Setup: Create division with 2 riders
      const season = await seasonRepo.createSeason({
        name: "Test Season",
        year: 2026,
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-12-31"),
      });

      const contest = await contestRepo.createContest({
        seasonId: season.id,
        name: "Test Contest",
        location: "Test Beach",
        startDate: new Date("2026-06-01"),
        endDate: new Date("2026-06-03"),
        status: "scheduled",
      });

      const division = await divisionRepo.createDivision({
        contestId: contest.id,
        name: "Men's Pro",
        category: "pro_men",
      });

      for (let i = 1; i <= 2; i++) {
        const rider = await riderRepo.createRider({
          firstName: `Rider`,
          lastName: `${i}`,
          country: "USA",
        });
        await participantRepo.addParticipant(division.id, rider.id);
      }

      // Try with invalid format
      const request = new Request("http://localhost/api/divisions/123/brackets/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format: "double_elimination" }), // Invalid format
      });

      const response = await handleGenerateBracket(division.id, request);

      expect(response.status).toBe(400);
      const result = await response.json();
      expect(result.error).toContain("Validation error");
    });
  });

  describe("handleGetBracketWithHeats", () => {
    it("should return bracket with heats structure", async () => {
      // Setup: Create and generate bracket
      const season = await seasonRepo.createSeason({
        name: "Test Season",
        year: 2026,
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-12-31"),
      });

      const contest = await contestRepo.createContest({
        seasonId: season.id,
        name: "Test Contest",
        location: "Test Beach",
        startDate: new Date("2026-06-01"),
        endDate: new Date("2026-06-03"),
        status: "scheduled",
      });

      const division = await divisionRepo.createDivision({
        contestId: contest.id,
        name: "Men's Pro",
        category: "pro_men",
      });

      for (let i = 1; i <= 4; i++) {
        const rider = await riderRepo.createRider({
          firstName: `Rider`,
          lastName: `${i}`,
          country: "USA",
        });
        await participantRepo.addParticipant(division.id, rider.id);
      }

      // Generate bracket
      const generateRequest = new Request("http://localhost/api/divisions/123/brackets/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format: "single_elimination" }),
      });

      const generateResponse = await handleGenerateBracket(division.id, generateRequest);
      const generateResult = await generateResponse.json();
      const bracketId = generateResult.bracketId;

      // Get bracket
      const response = await handleGetBracketWithHeats(bracketId);

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.bracket).toBeDefined();
      expect(result.bracket.id).toBe(bracketId);
      expect(result.rounds).toBeDefined();
      expect(Array.isArray(result.rounds)).toBe(true);

      // For 4 riders, should have rounds
      expect(result.rounds.length).toBeGreaterThan(0);

      // Verify round structure
      const round1 = result.rounds.find((r: any) => r.roundNumber === 1);
      expect(round1).toBeDefined();
      expect(round1.heats).toBeDefined();
      expect(Array.isArray(round1.heats)).toBe(true);
    });

    it("should return 404 for non-existent bracket", async () => {
      const nonExistentBracketId = "00000000-0000-0000-0000-000000000000";

      const response = await handleGetBracketWithHeats(nonExistentBracketId);

      expect(response.status).toBe(404);
      const result = await response.json();
      expect(result.error).toContain("not found");
    });
  });
});
