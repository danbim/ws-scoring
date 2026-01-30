import { beforeEach, describe, expect, it, mock } from "bun:test";
import {
  HeatCompletedError,
  HeatDoesNotExistError,
  RiderNotInHeatError,
  ScoreMustBeInValidRangeError,
  ScoreNotFoundError,
  ScoreTypeMismatchError,
  ScoreUUIDAlreadyExistsError,
} from "../../../src/domain/heat/errors.js";
import { HeatService } from "../../../src/domain/heat/heat-service.js";
import type {
  Heat,
  HeatRepository,
  Score,
  ScoreRepository,
} from "../../../src/domain/heat/repositories.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockHeat(overrides: Partial<Heat> = {}): Heat {
  return {
    id: "db-id-1",
    heatId: "heat-1",
    bracketId: "bracket-1",
    riderIds: ["rider-1", "rider-2"],
    wavesCounting: 3,
    jumpsCounting: 2,
    position: "R1H1",
    roundNumber: 1,
    roundName: "Round 1",
    completedAt: null,
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-01"),
    ...overrides,
  };
}

function createMockScore(overrides: Partial<Score> = {}): Score {
  return {
    id: "score-db-id-1",
    scoreUuid: "score-uuid-1",
    heatId: "heat-1",
    riderId: "rider-1",
    judgeId: "judge-1",
    type: "wave",
    scoreValue: 7.5,
    jumpType: null,
    jumpModifiers: null,
    timestamp: new Date("2025-01-01T10:00:00Z"),
    createdAt: new Date("2025-01-01T10:00:00Z"),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Mock repository factories
// ---------------------------------------------------------------------------

function createMockHeatRepository(): HeatRepository {
  return {
    createHeat: mock(() => Promise.resolve(createMockHeat())),
    getHeatByHeatId: mock(() => Promise.resolve(createMockHeat())),
    getHeatsByBracketId: mock(() => Promise.resolve([])),
    getAllHeats: mock(() => Promise.resolve([])),
    updateHeat: mock(() => Promise.resolve(createMockHeat())),
    deleteHeat: mock(() => Promise.resolve()),
    createHeatWithBracketMetadata: mock(() => Promise.resolve()),
    completeHeat: mock(() => Promise.resolve()),
    markCompleted: mock(() => Promise.resolve()),
    addRiderToHeat: mock(() => Promise.resolve()),
    getHeatRiderIds: mock(() => Promise.resolve([])),
    getHeatMetadata: mock(() => Promise.resolve(null)),
  };
}

function createMockScoreRepository(): ScoreRepository {
  return {
    insertScore: mock(() => Promise.resolve()),
    getScoresByHeatId: mock(() => Promise.resolve([])),
    getScoreByUuid: mock(() => Promise.resolve(null)),
    updateScore: mock(() => Promise.resolve()),
    deleteScore: mock(() => Promise.resolve()),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("HeatService", () => {
  let heatRepo: HeatRepository;
  let scoreRepo: ScoreRepository;
  let service: HeatService;

  beforeEach(() => {
    heatRepo = createMockHeatRepository();
    scoreRepo = createMockScoreRepository();
    service = new HeatService(heatRepo, scoreRepo);
  });

  // -----------------------------------------------------------------------
  // addWaveScore
  // -----------------------------------------------------------------------
  describe("addWaveScore", () => {
    it("should insert a wave score for valid input", async () => {
      // heat exists, not completed, rider in heat, score not duplicate
      (heatRepo.getHeatByHeatId as ReturnType<typeof mock>).mockResolvedValue(createMockHeat());
      (scoreRepo.getScoreByUuid as ReturnType<typeof mock>).mockResolvedValue(null);

      await service.addWaveScore("heat-1", "new-score-uuid", "rider-1", "judge-1", 7.5, new Date());

      expect(scoreRepo.insertScore).toHaveBeenCalledTimes(1);
      const insertCall = (scoreRepo.insertScore as ReturnType<typeof mock>).mock.calls[0];
      expect(insertCall[0]).toMatchObject({
        scoreUuid: "new-score-uuid",
        heatId: "heat-1",
        riderId: "rider-1",
        judgeId: "judge-1",
        type: "wave",
        scoreValue: 7.5,
      });
    });

    it("should accept a score of exactly 0", async () => {
      (heatRepo.getHeatByHeatId as ReturnType<typeof mock>).mockResolvedValue(createMockHeat());
      (scoreRepo.getScoreByUuid as ReturnType<typeof mock>).mockResolvedValue(null);

      await service.addWaveScore("heat-1", "score-zero", "rider-1", "judge-1", 0, new Date());

      expect(scoreRepo.insertScore).toHaveBeenCalledTimes(1);
      const insertCall = (scoreRepo.insertScore as ReturnType<typeof mock>).mock.calls[0];
      expect(insertCall[0].scoreValue).toBe(0);
    });

    it("should accept a score of exactly 10", async () => {
      (heatRepo.getHeatByHeatId as ReturnType<typeof mock>).mockResolvedValue(createMockHeat());
      (scoreRepo.getScoreByUuid as ReturnType<typeof mock>).mockResolvedValue(null);

      await service.addWaveScore("heat-1", "score-ten", "rider-1", "judge-1", 10, new Date());

      expect(scoreRepo.insertScore).toHaveBeenCalledTimes(1);
      const insertCall = (scoreRepo.insertScore as ReturnType<typeof mock>).mock.calls[0];
      expect(insertCall[0].scoreValue).toBe(10);
    });

    it("should throw HeatDoesNotExistError when heat not found", async () => {
      (heatRepo.getHeatByHeatId as ReturnType<typeof mock>).mockResolvedValue(null);

      await expect(
        service.addWaveScore("nonexistent-heat", "score-uuid", "rider-1", "judge-1", 5, new Date())
      ).rejects.toThrow(HeatDoesNotExistError);
    });

    it("should throw HeatCompletedError when heat is completed", async () => {
      (heatRepo.getHeatByHeatId as ReturnType<typeof mock>).mockResolvedValue(
        createMockHeat({ completedAt: new Date("2025-06-01") })
      );

      await expect(
        service.addWaveScore("heat-1", "score-uuid", "rider-1", "judge-1", 5, new Date())
      ).rejects.toThrow(HeatCompletedError);
    });

    it("should throw RiderNotInHeatError when rider is not in heat", async () => {
      (heatRepo.getHeatByHeatId as ReturnType<typeof mock>).mockResolvedValue(
        createMockHeat({ riderIds: ["rider-1", "rider-2"] })
      );

      await expect(
        service.addWaveScore("heat-1", "score-uuid", "rider-999", "judge-1", 5, new Date())
      ).rejects.toThrow(RiderNotInHeatError);
    });

    it("should throw ScoreMustBeInValidRangeError for score > 10", async () => {
      (heatRepo.getHeatByHeatId as ReturnType<typeof mock>).mockResolvedValue(createMockHeat());

      await expect(
        service.addWaveScore("heat-1", "score-uuid", "rider-1", "judge-1", 10.1, new Date())
      ).rejects.toThrow(ScoreMustBeInValidRangeError);
    });

    it("should throw ScoreMustBeInValidRangeError for score < 0", async () => {
      (heatRepo.getHeatByHeatId as ReturnType<typeof mock>).mockResolvedValue(createMockHeat());

      await expect(
        service.addWaveScore("heat-1", "score-uuid", "rider-1", "judge-1", -0.1, new Date())
      ).rejects.toThrow(ScoreMustBeInValidRangeError);
    });

    it("should throw ScoreUUIDAlreadyExistsError for duplicate UUID", async () => {
      (heatRepo.getHeatByHeatId as ReturnType<typeof mock>).mockResolvedValue(createMockHeat());
      (scoreRepo.getScoreByUuid as ReturnType<typeof mock>).mockResolvedValue(
        createMockScore({ scoreUuid: "duplicate-uuid" })
      );

      await expect(
        service.addWaveScore("heat-1", "duplicate-uuid", "rider-1", "judge-1", 5, new Date())
      ).rejects.toThrow(ScoreUUIDAlreadyExistsError);
    });
  });

  // -----------------------------------------------------------------------
  // addJumpScore
  // -----------------------------------------------------------------------
  describe("addJumpScore", () => {
    it("should insert a jump score with type and modifiers", async () => {
      (heatRepo.getHeatByHeatId as ReturnType<typeof mock>).mockResolvedValue(createMockHeat());
      (scoreRepo.getScoreByUuid as ReturnType<typeof mock>).mockResolvedValue(null);

      await service.addJumpScore(
        "heat-1",
        "jump-score-uuid",
        "rider-1",
        "judge-1",
        8.5,
        "forward",
        ["backside", "grabbed"],
        new Date()
      );

      expect(scoreRepo.insertScore).toHaveBeenCalledTimes(1);
      const insertCall = (scoreRepo.insertScore as ReturnType<typeof mock>).mock.calls[0];
      expect(insertCall[0]).toMatchObject({
        scoreUuid: "jump-score-uuid",
        heatId: "heat-1",
        riderId: "rider-1",
        judgeId: "judge-1",
        type: "jump",
        scoreValue: 8.5,
        jumpType: "forward",
        jumpModifiers: ["backside", "grabbed"],
      });
    });

    it("should insert a jump score with empty modifiers", async () => {
      (heatRepo.getHeatByHeatId as ReturnType<typeof mock>).mockResolvedValue(createMockHeat());
      (scoreRepo.getScoreByUuid as ReturnType<typeof mock>).mockResolvedValue(null);

      await service.addJumpScore(
        "heat-1",
        "jump-score-uuid-2",
        "rider-2",
        "judge-1",
        6.0,
        "backloop",
        [],
        new Date()
      );

      expect(scoreRepo.insertScore).toHaveBeenCalledTimes(1);
      const insertCall = (scoreRepo.insertScore as ReturnType<typeof mock>).mock.calls[0];
      expect(insertCall[0]).toMatchObject({
        type: "jump",
        jumpType: "backloop",
        jumpModifiers: [],
      });
    });

    it("should throw HeatDoesNotExistError when heat not found", async () => {
      (heatRepo.getHeatByHeatId as ReturnType<typeof mock>).mockResolvedValue(null);

      await expect(
        service.addJumpScore(
          "nonexistent-heat",
          "score-uuid",
          "rider-1",
          "judge-1",
          5,
          "forward",
          [],
          new Date()
        )
      ).rejects.toThrow(HeatDoesNotExistError);
    });
  });

  // -----------------------------------------------------------------------
  // updateWaveScore
  // -----------------------------------------------------------------------
  describe("updateWaveScore", () => {
    it("should update the score value for a valid wave score", async () => {
      const existingScore = createMockScore({
        scoreUuid: "wave-uuid",
        type: "wave",
        heatId: "heat-1",
      });
      (scoreRepo.getScoreByUuid as ReturnType<typeof mock>).mockResolvedValue(existingScore);
      (heatRepo.getHeatByHeatId as ReturnType<typeof mock>).mockResolvedValue(createMockHeat());

      await service.updateWaveScore("wave-uuid", 9.0);

      expect(scoreRepo.updateScore).toHaveBeenCalledWith("wave-uuid", {
        scoreValue: 9.0,
      });
    });

    it("should throw when score not found", async () => {
      (scoreRepo.getScoreByUuid as ReturnType<typeof mock>).mockResolvedValue(null);

      await expect(service.updateWaveScore("missing-uuid", 5)).rejects.toBeInstanceOf(
        ScoreNotFoundError
      );
    });

    it("should throw when score is not a wave score", async () => {
      const jumpScore = createMockScore({
        scoreUuid: "jump-uuid",
        type: "jump",
      });
      (scoreRepo.getScoreByUuid as ReturnType<typeof mock>).mockResolvedValue(jumpScore);

      await expect(service.updateWaveScore("jump-uuid", 5)).rejects.toBeInstanceOf(
        ScoreTypeMismatchError
      );
    });

    it("should throw HeatCompletedError when heat is completed", async () => {
      const existingScore = createMockScore({
        scoreUuid: "wave-uuid",
        type: "wave",
        heatId: "heat-1",
      });
      (scoreRepo.getScoreByUuid as ReturnType<typeof mock>).mockResolvedValue(existingScore);
      (heatRepo.getHeatByHeatId as ReturnType<typeof mock>).mockResolvedValue(
        createMockHeat({ completedAt: new Date("2025-06-01") })
      );

      await expect(service.updateWaveScore("wave-uuid", 8)).rejects.toThrow(HeatCompletedError);
    });

    it("should throw ScoreMustBeInValidRangeError for invalid score", async () => {
      const existingScore = createMockScore({
        scoreUuid: "wave-uuid",
        type: "wave",
        heatId: "heat-1",
      });
      (scoreRepo.getScoreByUuid as ReturnType<typeof mock>).mockResolvedValue(existingScore);
      (heatRepo.getHeatByHeatId as ReturnType<typeof mock>).mockResolvedValue(createMockHeat());

      await expect(service.updateWaveScore("wave-uuid", 11)).rejects.toThrow(
        ScoreMustBeInValidRangeError
      );

      await expect(service.updateWaveScore("wave-uuid", -1)).rejects.toThrow(
        ScoreMustBeInValidRangeError
      );
    });
  });

  // -----------------------------------------------------------------------
  // updateJumpScore
  // -----------------------------------------------------------------------
  describe("updateJumpScore", () => {
    it("should update value, type, and modifiers for a valid jump score", async () => {
      const existingScore = createMockScore({
        scoreUuid: "jump-uuid",
        type: "jump",
        heatId: "heat-1",
        jumpType: "forward",
        jumpModifiers: [],
      });
      (scoreRepo.getScoreByUuid as ReturnType<typeof mock>).mockResolvedValue(existingScore);
      (heatRepo.getHeatByHeatId as ReturnType<typeof mock>).mockResolvedValue(createMockHeat());

      await service.updateJumpScore("jump-uuid", 9.0, "backloop", ["grabbed"]);

      expect(scoreRepo.updateScore).toHaveBeenCalledWith("jump-uuid", {
        scoreValue: 9.0,
        jumpType: "backloop",
        jumpModifiers: ["grabbed"],
      });
    });

    it("should update with only scoreValue when optional params omitted", async () => {
      const existingScore = createMockScore({
        scoreUuid: "jump-uuid",
        type: "jump",
        heatId: "heat-1",
        jumpType: "forward",
        jumpModifiers: ["grabbed"],
      });
      (scoreRepo.getScoreByUuid as ReturnType<typeof mock>).mockResolvedValue(existingScore);
      (heatRepo.getHeatByHeatId as ReturnType<typeof mock>).mockResolvedValue(createMockHeat());

      await service.updateJumpScore("jump-uuid", 8.0);

      expect(scoreRepo.updateScore).toHaveBeenCalledWith("jump-uuid", {
        scoreValue: 8.0,
        jumpType: undefined,
        jumpModifiers: undefined,
      });
    });

    it("should throw when score is not a jump score", async () => {
      const waveScore = createMockScore({
        scoreUuid: "wave-uuid",
        type: "wave",
      });
      (scoreRepo.getScoreByUuid as ReturnType<typeof mock>).mockResolvedValue(waveScore);

      await expect(service.updateJumpScore("wave-uuid", 5, "forward", [])).rejects.toBeInstanceOf(
        ScoreTypeMismatchError
      );
    });
  });

  // -----------------------------------------------------------------------
  // deleteScore
  // -----------------------------------------------------------------------
  describe("deleteScore", () => {
    it("should delete an existing score", async () => {
      const existingScore = createMockScore({
        scoreUuid: "delete-me",
        heatId: "heat-1",
      });
      (scoreRepo.getScoreByUuid as ReturnType<typeof mock>).mockResolvedValue(existingScore);
      (heatRepo.getHeatByHeatId as ReturnType<typeof mock>).mockResolvedValue(createMockHeat());

      await service.deleteScore("delete-me");

      expect(scoreRepo.deleteScore).toHaveBeenCalledWith("delete-me");
    });

    it("should throw when score not found", async () => {
      (scoreRepo.getScoreByUuid as ReturnType<typeof mock>).mockResolvedValue(null);

      await expect(service.deleteScore("missing-uuid")).rejects.toBeInstanceOf(ScoreNotFoundError);
    });

    it("should throw HeatCompletedError when heat is completed", async () => {
      const existingScore = createMockScore({
        scoreUuid: "score-in-completed",
        heatId: "heat-1",
      });
      (scoreRepo.getScoreByUuid as ReturnType<typeof mock>).mockResolvedValue(existingScore);
      (heatRepo.getHeatByHeatId as ReturnType<typeof mock>).mockResolvedValue(
        createMockHeat({ completedAt: new Date("2025-06-01") })
      );

      await expect(service.deleteScore("score-in-completed")).rejects.toThrow(HeatCompletedError);
    });
  });

  // -----------------------------------------------------------------------
  // completeHeat
  // -----------------------------------------------------------------------
  // Note: completeHeat uses getDb().transaction() directly, so it cannot be
  // unit-tested with mocked repositories alone. It is covered by integration
  // tests (see __tests__/integration/ and __tests__/api/).
});
