// Seed data configuration
// Modify this file to customize seed data

import type {
  BracketFormat,
  ContestStatus,
  CreateBracketInput,
  CreateContestInput,
  CreateDivisionInput,
  CreateSeasonInput,
  DivisionCategory,
} from "../../src/domain/contest/types.js";
import type { CreateRiderInput } from "../../src/domain/rider/types.js";

export interface SeedData {
  heats: Array<{
    heatId: string;
    bracketId: string;
    riderIds: string[];
    heatRules: {
      wavesCounting: number;
      jumpsCounting: number;
    };
    scores?: Array<
      | {
          type: "wave";
          riderId: string;
          scoreUUID: string;
          waveScore: number;
        }
      | {
          type: "jump";
          riderId: string;
          scoreUUID: string;
          jumpScore: number;
          jumpType: string;
        }
    >;
  }>;
}

// Scraped rider data structure (from JSON file)
export interface ScrapedRider {
  firstName: string;
  lastName: string;
  country: string;
  sailNumber: string;
}

// Configuration for generating seed data
export interface SeedConfig {
  season: CreateSeasonInput;
  contests: CreateContestInput[];
  divisions: Array<{
    contestName: string;
    divisions: CreateDivisionInput[];
  }>;
  brackets: Array<{
    divisionName: string;
    contestName: string;
    brackets: CreateBracketInput[];
  }>;
  participantsPerDivision: {
    min: number;
    max: number;
  };
}

// Generate seed configuration
export function generateSeedConfig(): SeedConfig {
  return {
    season: {
      name: "2026 Season",
      year: 2026,
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-12-31"),
    },
    contests: [
      {
        name: "Danish Open Spring 2026",
        location: "Klitmøller, Denmark",
        startDate: new Date("2026-04-01"),
        endDate: new Date("2026-04-07"),
        status: "draft" as ContestStatus,
        seasonId: "", // Will be set after season creation
      },
      {
        name: "Danish Open Autumn 2026",
        location: "Klitmøller, Denmark",
        startDate: new Date("2026-09-01"),
        endDate: new Date("2026-09-07"),
        status: "draft" as ContestStatus,
        seasonId: "", // Will be set after season creation
      },
    ],
    divisions: [
      {
        contestName: "Danish Open Spring 2026",
        divisions: [
          {
            name: "Pro Men",
            category: "pro_men" as DivisionCategory,
            contestId: "", // Will be set after contest creation
          },
          {
            name: "Pro Women",
            category: "pro_women" as DivisionCategory,
            contestId: "", // Will be set after contest creation
          },
        ],
      },
      {
        contestName: "Danish Open Autumn 2026",
        divisions: [
          {
            name: "Pro Men",
            category: "pro_men" as DivisionCategory,
            contestId: "", // Will be set after contest creation
          },
          {
            name: "Pro Women",
            category: "pro_women" as DivisionCategory,
            contestId: "", // Will be set after contest creation
          },
        ],
      },
    ],
    brackets: [
      // Spring contest brackets
      {
        contestName: "Danish Open Spring 2026",
        divisionName: "Pro Men",
        brackets: [
          {
            name: "Single Elimination",
            format: "single_elimination" as BracketFormat,
            status: "draft",
            divisionId: "", // Will be set after division creation
          },
          {
            name: "Double Elimination",
            format: "double_elimination" as BracketFormat,
            status: "draft",
            divisionId: "", // Will be set after division creation
          },
        ],
      },
      {
        contestName: "Danish Open Spring 2026",
        divisionName: "Pro Women",
        brackets: [
          {
            name: "Single Elimination",
            format: "single_elimination" as BracketFormat,
            status: "draft",
            divisionId: "", // Will be set after division creation
          },
          {
            name: "Double Elimination",
            format: "double_elimination" as BracketFormat,
            status: "draft",
            divisionId: "", // Will be set after division creation
          },
        ],
      },
      // Autumn contest brackets
      {
        contestName: "Danish Open Autumn 2026",
        divisionName: "Pro Men",
        brackets: [
          {
            name: "Single Elimination",
            format: "single_elimination" as BracketFormat,
            status: "draft",
            divisionId: "", // Will be set after division creation
          },
          {
            name: "Double Elimination",
            format: "double_elimination" as BracketFormat,
            status: "draft",
            divisionId: "", // Will be set after division creation
          },
        ],
      },
      {
        contestName: "Danish Open Autumn 2026",
        divisionName: "Pro Women",
        brackets: [
          {
            name: "Single Elimination",
            format: "single_elimination" as BracketFormat,
            status: "draft",
            divisionId: "", // Will be set after division creation
          },
          {
            name: "Double Elimination",
            format: "double_elimination" as BracketFormat,
            status: "draft",
            divisionId: "", // Will be set after division creation
          },
        ],
      },
    ],
    participantsPerDivision: {
      min: 16,
      max: 32,
    },
  };
}

// Convert scraped rider to CreateRiderInput
export function scrapedRiderToCreateInput(rider: ScrapedRider): CreateRiderInput {
  return {
    firstName: rider.firstName,
    lastName: rider.lastName,
    country: rider.country,
    sailNumber: rider.sailNumber,
    email: null,
    dateOfBirth: null,
  };
}

// Default test bracket ID - used for demo heats that don't belong to a real bracket
const DEFAULT_TEST_BRACKET_ID = "00000000-0000-0000-0000-000000000000";

export const seedData: SeedData = {
  heats: [
    {
      heatId: "demo-heat-1",
      bracketId: DEFAULT_TEST_BRACKET_ID,
      riderIds: ["rider-1", "rider-2"],
      heatRules: {
        wavesCounting: 2,
        jumpsCounting: 1,
      },
      scores: [
        {
          type: "wave",
          riderId: "rider-1",
          scoreUUID: "wave-1-r1",
          waveScore: 8.5,
        },
        {
          type: "wave",
          riderId: "rider-1",
          scoreUUID: "wave-2-r1",
          waveScore: 7.0,
        },
        {
          type: "jump",
          riderId: "rider-1",
          scoreUUID: "jump-1-r1",
          jumpScore: 9.0,
          jumpType: "forward",
        },
        {
          type: "wave",
          riderId: "rider-2",
          scoreUUID: "wave-1-r2",
          waveScore: 9.0,
        },
        {
          type: "wave",
          riderId: "rider-2",
          scoreUUID: "wave-2-r2",
          waveScore: 8.0,
        },
        {
          type: "jump",
          riderId: "rider-2",
          scoreUUID: "jump-1-r2",
          jumpScore: 8.5,
          jumpType: "backloop",
        },
      ],
    },
    {
      heatId: "demo-heat-2",
      bracketId: DEFAULT_TEST_BRACKET_ID,
      riderIds: ["rider-3", "rider-4", "rider-5"],
      heatRules: {
        wavesCounting: 3,
        jumpsCounting: 2,
      },
      scores: [
        {
          type: "wave",
          riderId: "rider-3",
          scoreUUID: "wave-1-r3",
          waveScore: 7.5,
        },
        {
          type: "jump",
          riderId: "rider-4",
          scoreUUID: "jump-1-r4",
          jumpScore: 9.5,
          jumpType: "doubleForward",
        },
      ],
    },
  ],
};
