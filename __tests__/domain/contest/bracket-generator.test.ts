import { describe, expect, it } from "bun:test";
import {
  generateDingleEliminationBracket,
  generateDoubleEliminationBracket,
  generateSingleEliminationBracket,
} from "../../../src/domain/contest/bracket-generator.js";

describe("Bracket Generator", () => {
  describe("generateSingleEliminationBracket", () => {
    it("should generate bracket structure for 2 participants", () => {
      const result = generateSingleEliminationBracket(2);
      expect(result).toHaveLength(1);
      expect(result[0].heatId).toBe("1");
      expect(result[0].riderIds).toEqual([]);
    });

    it("should generate bracket structure for 4 participants", () => {
      const result = generateSingleEliminationBracket(4);
      expect(result.length).toBeGreaterThan(0);
      // First round should have 2 heats (1a, 1b)
      const firstRoundHeats = result.filter((h) => h.heatId === "1a" || h.heatId === "1b");
      expect(firstRoundHeats.length).toBe(2);
    });

    it("should generate bracket structure for 8 participants", () => {
      const result = generateSingleEliminationBracket(8);
      expect(result.length).toBeGreaterThan(0);
      // Should have multiple rounds
      const heatIds = result.map((h) => h.heatId);
      expect(heatIds).toContain("1a");
      expect(heatIds).toContain("1b");
    });

    it("should distribute participants to first round heats", () => {
      const participants = ["rider-1", "rider-2", "rider-3", "rider-4"];
      const result = generateSingleEliminationBracket(4, participants);

      // All participants should be assigned to first round heats
      const allRiderIds = result.flatMap((h) => h.riderIds);
      expect(allRiderIds.length).toBe(4);
      expect(allRiderIds).toContain("rider-1");
      expect(allRiderIds).toContain("rider-2");
      expect(allRiderIds).toContain("rider-3");
      expect(allRiderIds).toContain("rider-4");
    });

    it("should assign 2 riders per first round heat", () => {
      const participants = ["rider-1", "rider-2", "rider-3", "rider-4"];
      const result = generateSingleEliminationBracket(4, participants);

      // First round heats should have 2 riders each
      const firstRoundHeats = result.filter((h) => h.heatId === "1a" || h.heatId === "1b");
      for (const heat of firstRoundHeats) {
        expect(heat.riderIds.length).toBe(2);
      }
    });

    it("should handle fewer participants than participantCount", () => {
      const participants = ["rider-1", "rider-2"];
      const result = generateSingleEliminationBracket(8, participants);

      // Should generate bracket for 8, but only assign 2 participants
      const allRiderIds = result.flatMap((h) => h.riderIds);
      expect(allRiderIds.length).toBe(2);
      expect(allRiderIds).toContain("rider-1");
      expect(allRiderIds).toContain("rider-2");
    });

    it("should handle more participants than participantCount", () => {
      const participants = ["rider-1", "rider-2", "rider-3", "rider-4", "rider-5", "rider-6"];
      const result = generateSingleEliminationBracket(4, participants);

      // Should only assign 4 participants (2 per heat in first round)
      const allRiderIds = result.flatMap((h) => h.riderIds);
      expect(allRiderIds.length).toBe(4);
    });

    it("should generate empty heats when no participants provided", () => {
      const result = generateSingleEliminationBracket(4);
      const allRiderIds = result.flatMap((h) => h.riderIds);
      expect(allRiderIds.length).toBe(0);
    });

    it("should shuffle participants before distribution", () => {
      const participants = ["rider-1", "rider-2", "rider-3", "rider-4"];
      const result1 = generateSingleEliminationBracket(4, participants);
      const result2 = generateSingleEliminationBracket(4, participants);

      // Results should potentially differ due to shuffling
      // At least verify that all participants are still present
      const allRiderIds1 = result1.flatMap((h) => h.riderIds);
      const allRiderIds2 = result2.flatMap((h) => h.riderIds);
      expect(allRiderIds1.sort()).toEqual(allRiderIds2.sort());
    });

    it("should generate correct heat ID pattern for 16 participants", () => {
      const result = generateSingleEliminationBracket(16);
      const heatIds = result.map((h) => h.heatId);

      // Should have first round with 8 heats (1a, 1b, 2a, 2b, 3a, 3b, 4a, 4b)
      expect(heatIds).toContain("1a");
      expect(heatIds).toContain("1b");
      expect(heatIds).toContain("4a");
      expect(heatIds).toContain("4b");
    });
  });

  describe("generateDoubleEliminationBracket", () => {
    it("should generate heats starting after single elimination final", () => {
      const result = generateDoubleEliminationBracket(33, 8);
      expect(result.length).toBeGreaterThan(0);

      // All heat IDs should be numeric and >= 34 (after final heat 33)
      const heatIds = result.map((h) => parseInt(h.heatId, 10));
      for (const heatId of heatIds) {
        expect(heatId).toBeGreaterThanOrEqual(34);
      }
    });

    it("should generate empty heats when no participants provided", () => {
      const result = generateDoubleEliminationBracket(33, 8);
      const allRiderIds = result.flatMap((h) => h.riderIds);
      expect(allRiderIds.length).toBe(0);
    });

    it("should distribute participants if provided", () => {
      const participants = ["rider-1", "rider-2", "rider-3", "rider-4"];
      const result = generateDoubleEliminationBracket(33, 8, participants);

      const allRiderIds = result.flatMap((h) => h.riderIds);
      expect(allRiderIds.length).toBeGreaterThan(0);
      expect(allRiderIds).toContain("rider-1");
    });

    it("should handle different starting heat numbers", () => {
      const result1 = generateDoubleEliminationBracket(10, 4);
      const result2 = generateDoubleEliminationBracket(20, 4);

      const heatIds1 = result1.map((h) => parseInt(h.heatId, 10));
      const heatIds2 = result2.map((h) => parseInt(h.heatId, 10));

      // Result 2 should start at higher heat numbers
      expect(Math.min(...heatIds2)).toBeGreaterThan(Math.min(...heatIds1));
    });
  });

  describe("generateDingleEliminationBracket", () => {
    it("should generate bracket structure similar to single elimination", () => {
      const result = generateDingleEliminationBracket(4);
      expect(result.length).toBeGreaterThan(0);
    });

    it("should distribute participants to first round heats", () => {
      const participants = ["rider-1", "rider-2", "rider-3", "rider-4"];
      const result = generateDingleEliminationBracket(4, participants);

      const allRiderIds = result.flatMap((h) => h.riderIds);
      expect(allRiderIds.length).toBe(4);
      expect(allRiderIds).toContain("rider-1");
      expect(allRiderIds).toContain("rider-2");
      expect(allRiderIds).toContain("rider-3");
      expect(allRiderIds).toContain("rider-4");
    });

    it("should generate empty heats when no participants provided", () => {
      const result = generateDingleEliminationBracket(4);
      const allRiderIds = result.flatMap((h) => h.riderIds);
      expect(allRiderIds.length).toBe(0);
    });

    it("should handle different participant counts", () => {
      const result8 = generateDingleEliminationBracket(8);
      const result16 = generateDingleEliminationBracket(16);

      expect(result16.length).toBeGreaterThan(result8.length);
    });
  });
});
