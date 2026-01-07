import { describe, expect, it, mock } from "bun:test";
import {
  BracketAlreadyExistsError,
  DivisionNotFoundError,
  generateBracketForDivision,
  InsufficientParticipantsError,
} from "../../../src/domain/bracket/bracket-service.js";
import type { Bracket, Division } from "../../../src/domain/contest/types.js";

describe("generateBracketForDivision", () => {
  // Note: Tests that create real heats in the event store are skipped
  // and covered by integration tests instead

  it("should throw DivisionNotFoundError if division does not exist", async () => {
    const mockDivisionRepo = {
      getDivisionById: mock(() => Promise.resolve(null)),
    };
    const mockBracketRepo = {};
    const mockParticipantRepo = {};
    const mockHeatRepo = {};

    await expect(
      generateBracketForDivision(
        "non-existent-division",
        {
          divisionRepository: mockDivisionRepo as any,
          bracketRepository: mockBracketRepo as any,
          divisionParticipantRepository: mockParticipantRepo as any,
          heatRepository: mockHeatRepo as any,
        },
        { useTransaction: false }
      )
    ).rejects.toThrow(DivisionNotFoundError);

    expect(mockDivisionRepo.getDivisionById).toHaveBeenCalledWith("non-existent-division");
  });

  it("should throw InsufficientParticipantsError if division has less than 2 participants", async () => {
    const mockDivision: Division = {
      id: "division-1",
      contestId: "contest-1",
      name: "Test Division",
      category: "pro_men",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockDivisionRepo = {
      getDivisionById: mock(() => Promise.resolve(mockDivision)),
    };
    const mockBracketRepo = {
      getBracketByDivisionId: mock(() => Promise.resolve(null)),
    };
    const mockParticipantRepo = {
      getRiderIdsByDivisionId: mock(() => Promise.resolve(["rider-1"])), // Only 1 rider
    };
    const mockHeatRepo = {};

    await expect(
      generateBracketForDivision(
        "division-1",
        {
          divisionRepository: mockDivisionRepo as any,
          bracketRepository: mockBracketRepo as any,
          divisionParticipantRepository: mockParticipantRepo as any,
          heatRepository: mockHeatRepo as any,
        },
        { useTransaction: false }
      )
    ).rejects.toThrow(InsufficientParticipantsError);

    expect(mockParticipantRepo.getRiderIdsByDivisionId).toHaveBeenCalledWith("division-1");
  });

  it("should throw InsufficientParticipantsError with correct message for 1 participant", async () => {
    const mockDivision: Division = {
      id: "division-1",
      contestId: "contest-1",
      name: "Test Division",
      category: "pro_men",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockDivisionRepo = {
      getDivisionById: mock(() => Promise.resolve(mockDivision)),
    };
    const mockBracketRepo = {
      getBracketByDivisionId: mock(() => Promise.resolve(null)),
    };
    const mockParticipantRepo = {
      getRiderIdsByDivisionId: mock(() => Promise.resolve(["rider-1"])),
    };
    const mockHeatRepo = {};

    try {
      await generateBracketForDivision(
        "division-1",
        {
          divisionRepository: mockDivisionRepo as any,
          bracketRepository: mockBracketRepo as any,
          divisionParticipantRepository: mockParticipantRepo as any,
          heatRepository: mockHeatRepo as any,
        },
        { useTransaction: false }
      );
      expect.unreachable("Should have thrown error");
    } catch (error) {
      expect(error).toBeInstanceOf(InsufficientParticipantsError);
      expect((error as Error).message).toBe("Division has 1 participants, need at least 2");
    }
  });

  it("should throw BracketAlreadyExistsError if bracket already exists for division", async () => {
    const mockDivision: Division = {
      id: "division-1",
      contestId: "contest-1",
      name: "Test Division",
      category: "pro_men",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const existingBracket: Bracket = {
      id: "bracket-1",
      divisionId: "division-1",
      name: "Existing Bracket",
      format: "single_elimination",
      status: "in_progress",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockDivisionRepo = {
      getDivisionById: mock(() => Promise.resolve(mockDivision)),
    };
    const mockBracketRepo = {
      getBracketByDivisionId: mock(() => Promise.resolve(existingBracket)),
    };
    const mockParticipantRepo = {};
    const mockHeatRepo = {};

    await expect(
      generateBracketForDivision(
        "division-1",
        {
          divisionRepository: mockDivisionRepo as any,
          bracketRepository: mockBracketRepo as any,
          divisionParticipantRepository: mockParticipantRepo as any,
          heatRepository: mockHeatRepo as any,
        },
        { useTransaction: false }
      )
    ).rejects.toThrow(BracketAlreadyExistsError);

    expect(mockBracketRepo.getBracketByDivisionId).toHaveBeenCalledWith("division-1");
  });

  it("should throw error if division has more than 64 participants", async () => {
    const mockDivision: Division = {
      id: "division-1",
      contestId: "contest-1",
      name: "Test Division",
      category: "pro_men",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const riders = Array.from({ length: 65 }, (_, i) => `rider-${i + 1}`);

    const mockDivisionRepo = {
      getDivisionById: mock(() => Promise.resolve(mockDivision)),
    };
    const mockBracketRepo = {
      getBracketByDivisionId: mock(() => Promise.resolve(null)),
    };
    const mockParticipantRepo = {
      getRiderIdsByDivisionId: mock(() => Promise.resolve(riders)),
    };
    const mockHeatRepo = {};

    await expect(
      generateBracketForDivision(
        "division-1",
        {
          divisionRepository: mockDivisionRepo as any,
          bracketRepository: mockBracketRepo as any,
          divisionParticipantRepository: mockParticipantRepo as any,
          heatRepository: mockHeatRepo as any,
        },
        { useTransaction: false }
      )
    ).rejects.toThrow("Division has 65 participants, maximum is 64");
  });

  // These tests require event store and are covered by integration tests
  it.skip("should create bracket and all heats for valid division with 2 riders", async () => {
    const testId = `test-${Date.now()}-${Math.random()}`;
    const mockDivision: Division = {
      id: `division-${testId}`,
      contestId: "contest-1",
      name: "Test Division",
      category: "pro_men",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const createdBracket: Bracket = {
      id: `bracket-${testId}`,
      divisionId: `division-${testId}`,
      name: "Single Elimination",
      format: "single_elimination",
      status: "in_progress",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockDivisionRepo = {
      getDivisionById: mock(() => Promise.resolve(mockDivision)),
    };
    const mockBracketRepo = {
      getBracketByDivisionId: mock(() => Promise.resolve(null)),
      createBracket: mock(() => Promise.resolve(createdBracket)),
      deleteBracket: mock(() => Promise.resolve()),
    };
    const mockParticipantRepo = {
      getRiderIdsByDivisionId: mock(() => Promise.resolve(["rider-1", "rider-2"])),
    };
    const mockHeatRepo = {
      createHeatWithBracketMetadata: mock(() => Promise.resolve()),
      completeHeat: mock(() => Promise.resolve()),
    };

    const bracketId = await generateBracketForDivision(
      `division-${testId}`,
      {
        divisionRepository: mockDivisionRepo as any,
        bracketRepository: mockBracketRepo as any,
        divisionParticipantRepository: mockParticipantRepo as any,
        heatRepository: mockHeatRepo as any,
      },
      { useTransaction: false }
    );

    expect(bracketId).toBe(`bracket-${testId}`);
    expect(mockBracketRepo.createBracket).toHaveBeenCalledWith({
      divisionId: `division-${testId}`,
      name: "Single Elimination",
      format: "single_elimination",
      status: "in_progress",
    });

    // For 2 riders, should create 1 heat (the final) in relational DB
    expect(mockHeatRepo.createHeatWithBracketMetadata).toHaveBeenCalledTimes(1);
    // No bye heats for 2 riders
    expect(mockHeatRepo.completeHeat).not.toHaveBeenCalled();
  });

  // These tests require event store and are covered by integration tests
  it.skip("should auto-complete bye heats when bracket has byes", async () => {
    const testId = `test-${Date.now()}-${Math.random()}`;
    const mockDivision: Division = {
      id: `division-${testId}`,
      contestId: "contest-1",
      name: "Test Division",
      category: "pro_men",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const createdBracket: Bracket = {
      id: `bracket-${testId}`,
      divisionId: `division-${testId}`,
      name: "Single Elimination",
      format: "single_elimination",
      status: "in_progress",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockDivisionRepo = {
      getDivisionById: mock(() => Promise.resolve(mockDivision)),
    };
    const mockBracketRepo = {
      getBracketByDivisionId: mock(() => Promise.resolve(null)),
      createBracket: mock(() => Promise.resolve(createdBracket)),
      deleteBracket: mock(() => Promise.resolve()),
    };
    const mockParticipantRepo = {
      // 3 riders = 4-rider bracket with 1 bye
      getRiderIdsByDivisionId: mock(() => Promise.resolve(["rider-1", "rider-2", "rider-3"])),
    };

    let byeHeatsCompleted = 0;
    const mockHeatRepo = {
      createHeatWithBracketMetadata: mock(() => Promise.resolve()),
      completeHeat: mock(() => {
        byeHeatsCompleted++;
        return Promise.resolve();
      }),
    };

    await generateBracketForDivision(
      `division-${testId}`,
      {
        divisionRepository: mockDivisionRepo as any,
        bracketRepository: mockBracketRepo as any,
        divisionParticipantRepository: mockParticipantRepo as any,
        heatRepository: mockHeatRepo as any,
      },
      { useTransaction: false }
    );

    // Should have completed 1 bye heat
    expect(byeHeatsCompleted).toBe(1);
  });
});
