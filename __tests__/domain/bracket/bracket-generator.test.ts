import { describe, expect, it } from "bun:test";
import { generateSingleEliminationBracket } from "../../../src/domain/bracket/bracket-generator";

describe("generateSingleEliminationBracket", () => {
  describe("8 riders", () => {
    it("should generate bracket with correct structure", () => {
      const riders = ["r1", "r2", "r3", "r4", "r5", "r6", "r7", "r8"];
      const bracket = generateSingleEliminationBracket(riders);

      expect(bracket.rounds).toHaveLength(4);
      expect(bracket.totalHeats).toBe(8); // 4 + 2 + 1 + 1
    });

    it("should create round 1 with 4 heats", () => {
      const riders = ["r1", "r2", "r3", "r4", "r5", "r6", "r7", "r8"];
      const bracket = generateSingleEliminationBracket(riders);

      const round1 = bracket.rounds[0];
      expect(round1.roundNumber).toBe(1);
      expect(round1.roundName).toBe("Round 1");
      expect(round1.heats).toHaveLength(4);
      expect(round1.heats.map((h) => h.position)).toEqual(["1a", "1b", "2a", "2b"]);
    });

    it("should assign 2 riders to each round 1 heat", () => {
      const riders = ["r1", "r2", "r3", "r4", "r5", "r6", "r7", "r8"];
      const bracket = generateSingleEliminationBracket(riders);

      const round1 = bracket.rounds[0];
      for (const heat of round1.heats) {
        expect(heat.riderIds).toHaveLength(2);
      }
    });

    it("should create round 2 (semi-finals) with 2 heats", () => {
      const riders = ["r1", "r2", "r3", "r4", "r5", "r6", "r7", "r8"];
      const bracket = generateSingleEliminationBracket(riders);

      const round2 = bracket.rounds[1];
      expect(round2.roundNumber).toBe(2);
      expect(round2.roundName).toBe("Semi-Finals");
      expect(round2.heats).toHaveLength(2);
      expect(round2.heats.map((h) => h.position)).toEqual(["3a", "3b"]);
    });

    it("should set advancement rules for round 1", () => {
      const riders = ["r1", "r2", "r3", "r4", "r5", "r6", "r7", "r8"];
      const bracket = generateSingleEliminationBracket(riders);

      const round1 = bracket.rounds[0];
      expect(round1.heats[0].winnerDestinationPosition).toBe("3a");
      expect(round1.heats[1].winnerDestinationPosition).toBe("3a");
      expect(round1.heats[2].winnerDestinationPosition).toBe("3b");
      expect(round1.heats[3].winnerDestinationPosition).toBe("3b");
      expect(round1.heats[0].loserDestinationPosition).toBeNull();
    });

    it("should set advancement rules for semi-finals", () => {
      const riders = ["r1", "r2", "r3", "r4", "r5", "r6", "r7", "r8"];
      const bracket = generateSingleEliminationBracket(riders);

      const semiFinals = bracket.rounds[1];
      expect(semiFinals.heats[0].winnerDestinationPosition).toBe("5"); // Final
      expect(semiFinals.heats[0].loserDestinationPosition).toBe("4"); // Runners-up
      expect(semiFinals.heats[1].winnerDestinationPosition).toBe("5");
      expect(semiFinals.heats[1].loserDestinationPosition).toBe("4");
    });

    it("should create finals with no destination", () => {
      const riders = ["r1", "r2", "r3", "r4", "r5", "r6", "r7", "r8"];
      const bracket = generateSingleEliminationBracket(riders);

      const runnersUpFinal = bracket.rounds[2].heats[0];
      expect(runnersUpFinal.position).toBe("4");
      expect(runnersUpFinal.roundName).toBe("Runners-Up Final");
      expect(runnersUpFinal.winnerDestinationPosition).toBeNull();
      expect(runnersUpFinal.loserDestinationPosition).toBeNull();

      const final = bracket.rounds[3].heats[0];
      expect(final.position).toBe("5");
      expect(final.roundName).toBe("Final");
      expect(final.winnerDestinationPosition).toBeNull();
      expect(final.loserDestinationPosition).toBeNull();
    });
  });

  describe("2 riders (edge case)", () => {
    it("should generate single final heat", () => {
      const riders = ["r1", "r2"];
      const bracket = generateSingleEliminationBracket(riders);

      expect(bracket.rounds).toHaveLength(1);
      expect(bracket.totalHeats).toBe(1);
      expect(bracket.rounds[0].heats[0].position).toBe("1");
      expect(bracket.rounds[0].heats[0].roundName).toBe("Final");
      expect(bracket.rounds[0].heats[0].riderIds).toEqual(["r1", "r2"]);
    });
  });

  describe("6 riders (with byes)", () => {
    it("should generate 8-rider bracket with 2 byes", () => {
      const riders = ["r1", "r2", "r3", "r4", "r5", "r6"];
      const bracket = generateSingleEliminationBracket(riders);

      expect(bracket.byeCount).toBe(2);
      expect(bracket.bracketSize).toBe(8);
    });

    it("should assign byes to top 2 seeds in round 1", () => {
      const riders = ["r1", "r2", "r3", "r4", "r5", "r6"];
      const bracket = generateSingleEliminationBracket(riders);

      const round1 = bracket.rounds[0];
      const byeHeats = round1.heats.filter((h) => h.riderIds.length === 1);
      expect(byeHeats).toHaveLength(2);
    });
  });

  describe("validation", () => {
    it("should throw error for less than 2 riders", () => {
      expect(() => generateSingleEliminationBracket(["r1"])).toThrow("at least 2");
    });

    it("should throw error for more than 64 riders", () => {
      const riders = Array.from({ length: 65 }, (_, i) => `r${i}`);
      expect(() => generateSingleEliminationBracket(riders)).toThrow("at most 64");
    });
  });
});
