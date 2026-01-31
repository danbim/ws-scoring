import { afterAll, afterEach, beforeAll, describe, expect, it } from "bun:test";
import { generateBracketForDivision } from "../../src/domain/bracket/bracket-service.js";
import {
  createBracketRepository,
  createContestRepository,
  createDivisionParticipantRepository,
  createDivisionRepository,
  createHeatRepository,
  createRiderRepository,
  createSeasonRepository,
} from "../../src/infrastructure/repositories/index.js";
import { clearTestData, setupTestDb, teardownTestDb } from "../test-db.js";

describe("Bracket Generation Integration Tests", () => {
  let seasonRepo: ReturnType<typeof createSeasonRepository>;
  let contestRepo: ReturnType<typeof createContestRepository>;
  let divisionRepo: ReturnType<typeof createDivisionRepository>;
  let riderRepo: ReturnType<typeof createRiderRepository>;
  let participantRepo: ReturnType<typeof createDivisionParticipantRepository>;
  let bracketRepo: ReturnType<typeof createBracketRepository>;
  let heatRepo: ReturnType<typeof createHeatRepository>;

  // Setup isolated PGlite database for this test file
  beforeAll(async () => {
    const db = await setupTestDb();
    seasonRepo = createSeasonRepository(db);
    contestRepo = createContestRepository(db);
    divisionRepo = createDivisionRepository(db);
    riderRepo = createRiderRepository(db);
    participantRepo = createDivisionParticipantRepository(db);
    bracketRepo = createBracketRepository(db);
    heatRepo = createHeatRepository(db);
  });

  // Cleanup PGlite database after all tests
  afterAll(async () => {
    await teardownTestDb();
  });

  // Clean up data after each test
  afterEach(async () => {
    await clearTestData();
  });

  describe("8 riders (full bracket)", () => {
    it("should generate complete bracket with 4 rounds and correct heat counts", async () => {
      // Setup: Create season, contest, division, and 8 riders
      const season = await seasonRepo.createSeason({
        name: "2026 Season",
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

      // Create 8 riders
      const riders = [];
      for (let i = 1; i <= 8; i++) {
        const rider = await riderRepo.createRider({
          firstName: `Rider`,
          lastName: `${i}`,
          country: "USA",
        });
        riders.push(rider);
        await participantRepo.addParticipant(division.id, rider.id);
      }

      // Execute: Generate bracket
      const bracketId = await generateBracketForDivision(division.id, {
        divisionRepository: divisionRepo,
        bracketRepository: bracketRepo,
        divisionParticipantRepository: participantRepo,
        heatRepository: heatRepo,
      });

      // Verify: Check bracket structure
      expect(bracketId).toBeDefined();

      const bracket = await bracketRepo.getBracketById(bracketId);
      expect(bracket).not.toBeNull();
      expect(bracket?.divisionId).toBe(division.id);
      expect(bracket?.format).toBe("single_elimination");
      expect(bracket?.status).toBe("in_progress");

      // Verify: Check heat structure using getBracketWithHeats
      const bracketWithHeats = await bracketRepo.getBracketWithHeats(bracketId);
      expect(bracketWithHeats).not.toBeNull();

      // Should have 4 rounds for 8 riders:
      // Round 1: 4 heats, Semi-Finals: 2 heats, Runners-Up Final: 1 heat, Final: 1 heat
      expect(bracketWithHeats?.rounds).toHaveLength(4);

      const round1 = bracketWithHeats?.rounds.find((r) => r.roundName === "Round 1");
      expect(round1).toBeDefined();
      expect(round1?.heats).toHaveLength(4);
      // Each heat in round 1 should have 2 riders
      // biome-ignore lint/style/noNonNullAssertion: checked above
      for (const heat of round1!.heats) {
        expect(heat.riderIds).toHaveLength(2);
      }

      const semiFinals = bracketWithHeats?.rounds.find((r) => r.roundName === "Semi-Finals");
      expect(semiFinals).toBeDefined();
      expect(semiFinals?.heats).toHaveLength(2);
      // Semi-finals should have empty rider lists initially
      // biome-ignore lint/style/noNonNullAssertion: checked above
      for (const heat of semiFinals!.heats) {
        expect(heat.riderIds).toHaveLength(0);
      }

      const runnersUpFinal = bracketWithHeats?.rounds.find(
        (r) => r.roundName === "Runners-Up Final"
      );
      expect(runnersUpFinal).toBeDefined();
      expect(runnersUpFinal?.heats).toHaveLength(1);

      const final = bracketWithHeats?.rounds.find((r) => r.roundName === "Final");
      expect(final).toBeDefined();
      expect(final?.heats).toHaveLength(1);

      // Total heats: 4 + 2 + 1 + 1 = 8
      const totalHeats = bracketWithHeats?.rounds.reduce(
        (sum, round) => sum + round.heats.length,
        0
      );
      expect(totalHeats).toBe(8);

      // Verify advancement paths
      // biome-ignore lint/style/noNonNullAssertion: checked above
      const round1Heat1 = round1!.heats[0];
      expect(round1Heat1.winnerDestinationHeatId).toBeTruthy();
      expect(round1Heat1.loserDestinationHeatId).toBeNull(); // Single elimination

      // biome-ignore lint/style/noNonNullAssertion: checked above
      const semiFinalHeat1 = semiFinals!.heats[0];
      expect(semiFinalHeat1.winnerDestinationHeatId).toBeTruthy();
      expect(semiFinalHeat1.loserDestinationHeatId).toBeTruthy();

      // biome-ignore lint/style/noNonNullAssertion: checked above
      const finalHeat = final!.heats[0];
      expect(finalHeat.winnerDestinationHeatId).toBeNull();
      expect(finalHeat.loserDestinationHeatId).toBeNull();
    });
  });

  describe("6 riders (with byes)", () => {
    it("should generate bracket with 2 byes, auto-complete bye heats, and cascade riders forward", async () => {
      // Setup: Create season, contest, division, and 6 riders
      const season = await seasonRepo.createSeason({
        name: "2026 Season",
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
        name: "Women's Pro",
        category: "pro_women",
      });

      // Create 6 riders
      const riders = [];
      for (let i = 1; i <= 6; i++) {
        const rider = await riderRepo.createRider({
          firstName: `Rider`,
          lastName: `${i}`,
          country: "USA",
        });
        riders.push(rider);
        await participantRepo.addParticipant(division.id, rider.id);
      }

      // Execute: Generate bracket
      const bracketId = await generateBracketForDivision(division.id, {
        divisionRepository: divisionRepo,
        bracketRepository: bracketRepo,
        divisionParticipantRepository: participantRepo,
        heatRepository: heatRepo,
      });

      // Verify: Check bracket structure
      const bracketWithHeats = await bracketRepo.getBracketWithHeats(bracketId);
      expect(bracketWithHeats).not.toBeNull();

      // Should have 4 rounds (8-rider bracket with 2 byes)
      expect(bracketWithHeats?.rounds).toHaveLength(4);

      const round1 = bracketWithHeats?.rounds.find((r) => r.roundName === "Round 1");
      expect(round1).toBeDefined();
      expect(round1?.heats).toHaveLength(4);

      // Verify: 2 heats should have 1 rider (byes), 2 heats should have 2 riders
      // biome-ignore lint/style/noNonNullAssertion: checked above
      const byeHeats = round1!.heats.filter((h) => h.riderIds.length === 1);
      // biome-ignore lint/style/noNonNullAssertion: checked above
      const normalHeats = round1!.heats.filter((h) => h.riderIds.length === 2);
      expect(byeHeats).toHaveLength(2);
      expect(normalHeats).toHaveLength(2);

      // Verify: Bye heats should be marked as completed in the relational DB
      // Since bye heats are completed during generation, they should have no riders
      // waiting (the rider should have advanced to the next round)
      for (const byeHeat of byeHeats) {
        const heat = await heatRepo.getHeatByHeatId(byeHeat.heatId);
        expect(heat).not.toBeNull();
        // The heat should still have 1 rider in the DB (the bye rider)
        expect(heat?.riderIds).toHaveLength(1);
      }

      // Verify: Riders from bye heats should have advanced to semi-finals
      // The bye heats are completed synchronously during bracket generation
      // and the heat completion listener advances the winners
      // Let's wait a bit for event processing
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Refresh bracket data to see if riders advanced
      const refreshedBracket = await bracketRepo.getBracketWithHeats(bracketId);
      const refreshedSemiFinals = refreshedBracket?.rounds.find(
        (r) => r.roundName === "Semi-Finals"
      );

      // After bye heat completion, the riders should have advanced to semi-finals
      // Each semi-final heat should have 1 rider (the bye winner)
      // They're waiting for their opponents from the normal heats
      expect(refreshedSemiFinals).toBeDefined();

      // Count total riders in semi-finals (should be 2, one from each bye)
      const totalRidersInSemiFinals = refreshedSemiFinals?.heats.reduce(
        (sum, heat) => sum + heat.riderIds.length,
        0
      );
      expect(totalRidersInSemiFinals).toBe(2); // 2 bye winners

      // Verify: Total structure is correct for 8-rider bracket
      const totalHeats = bracketWithHeats?.rounds.reduce(
        (sum, round) => sum + round.heats.length,
        0
      );
      expect(totalHeats).toBe(8); // Same as 8-rider bracket: 4 + 2 + 1 + 1
    });
  });

  describe("error cases", () => {
    it("should throw error if division does not exist", async () => {
      const nonExistentDivisionId = "00000000-0000-0000-0000-000000000000";
      await expect(
        generateBracketForDivision(nonExistentDivisionId, {
          divisionRepository: divisionRepo,
          bracketRepository: bracketRepo,
          divisionParticipantRepository: participantRepo,
          heatRepository: heatRepo,
        })
      ).rejects.toThrow(`Division ${nonExistentDivisionId} not found`);
    });

    it("should throw error if division has insufficient participants", async () => {
      const season = await seasonRepo.createSeason({
        name: "2026 Season",
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

      // Add only 1 rider
      const rider = await riderRepo.createRider({
        firstName: "Solo",
        lastName: "Rider",
        country: "USA",
      });
      await participantRepo.addParticipant(division.id, rider.id);

      await expect(
        generateBracketForDivision(division.id, {
          divisionRepository: divisionRepo,
          bracketRepository: bracketRepo,
          divisionParticipantRepository: participantRepo,
          heatRepository: heatRepo,
        })
      ).rejects.toThrow("Division has 1 participants, need at least 2");
    });

    it("should throw error if bracket already exists for division", async () => {
      const season = await seasonRepo.createSeason({
        name: "2026 Season",
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

      // Add 2 riders
      for (let i = 1; i <= 2; i++) {
        const rider = await riderRepo.createRider({
          firstName: `Rider`,
          lastName: `${i}`,
          country: "USA",
        });
        await participantRepo.addParticipant(division.id, rider.id);
      }

      // Generate first bracket
      await generateBracketForDivision(division.id, {
        divisionRepository: divisionRepo,
        bracketRepository: bracketRepo,
        divisionParticipantRepository: participantRepo,
        heatRepository: heatRepo,
      });

      // Try to generate second bracket
      await expect(
        generateBracketForDivision(division.id, {
          divisionRepository: divisionRepo,
          bracketRepository: bracketRepo,
          divisionParticipantRepository: participantRepo,
          heatRepository: heatRepo,
        })
      ).rejects.toThrow("Bracket already exists for division");
    });
  });
});
