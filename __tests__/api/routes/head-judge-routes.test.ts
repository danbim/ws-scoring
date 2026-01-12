import { describe, expect, it, beforeAll, afterAll, beforeEach } from "bun:test";
import { setupTestDb, teardownTestDb, clearTestData } from "../../test-db";
import { handleGetHeadJudgeHeat } from "../../../src/api/routes/head-judge-routes";
import { createHeatRepository, createScoreRepository, createRiderRepository, createUserRepository, createSeasonRepository, createContestRepository, createDivisionRepository, createBracketRepository } from "../../../src/infrastructure/repositories";

describe("Head Judge Routes", () => {
  beforeAll(async () => {
    await setupTestDb();
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  beforeEach(async () => {
    await clearTestData();
  });

  it("should return 403 for regular judge", async () => {
    const userRepo = createUserRepository();
    const judge = await userRepo.createUser({
      username: "judge",
      email: "judge@test.com",
      password: "hash",
      role: "judge",
    });

    const request = {
      user: { id: judge.id, role: "judge" },
    } as Request & { user: { id: string; role: string } };

    const response = await handleGetHeadJudgeHeat("test-heat", request);
    expect(response.status).toBe(403);
  });

  it("should return heat state for head judge", async () => {
    const userRepo = createUserRepository();
    const heatRepo = createHeatRepository();
    const scoreRepo = createScoreRepository();
    const riderRepo = createRiderRepository();
    const seasonRepo = createSeasonRepository();
    const contestRepo = createContestRepository();
    const divisionRepo = createDivisionRepository();
    const bracketRepo = createBracketRepository();

    const headJudge = await userRepo.createUser({
      username: "headjudge",
      email: "headjudge@test.com",
      password: "hash",
      role: "head_judge",
    });

    const judge1 = await userRepo.createUser({
      username: "judge1",
      email: "judge1@test.com",
      password: "hash",
      role: "judge",
    });

    const rider = await riderRepo.createRider({
      firstName: "John",
      lastName: "Doe",
      country: "USA",
      sailNumber: "42",
    });

    // Create season, contest, division, and bracket
    const season = await seasonRepo.createSeason({
      name: "Test Season",
      year: 2026,
      startDate: new Date(),
      endDate: new Date(),
    });

    const contest = await contestRepo.createContest({
      seasonId: season.id,
      name: "Test Contest",
      location: "Test Location",
      startDate: new Date(),
      endDate: new Date(),
      status: "in_progress",
    });

    const division = await divisionRepo.createDivision({
      contestId: contest.id,
      name: "Test Division",
      category: "pro_men",
    });

    const bracket = await bracketRepo.createBracket({
      divisionId: division.id,
      name: "Test Bracket",
      format: "single_elimination",
      status: "active",
    });

    const heat = await heatRepo.createHeat({
      heatId: "test-heat",
      bracketId: bracket.id,
      riderIds: [rider.id],
      wavesCounting: 2,
      jumpsCounting: 2,
      position: "1",
      roundNumber: 1,
      roundName: "Round 1",
    });

    await scoreRepo.insertScore({
      scoreUuid: "score-1",
      heatId: "test-heat",
      riderId: rider.id,
      judgeId: judge1.id,
      type: "wave",
      scoreValue: 7.5,
      timestamp: new Date(),
    });

    const request = {
      user: { id: headJudge.id, role: "head_judge" },
    } as Request & { user: { id: string; role: string } };

    const response = await handleGetHeadJudgeHeat("test-heat", request);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.heatId).toBe("test-heat");
    expect(data.judges).toHaveLength(1);
    expect(data.judges[0].judgeId).toBe(judge1.id);
    expect(data.riders).toHaveLength(1);
  });
});
