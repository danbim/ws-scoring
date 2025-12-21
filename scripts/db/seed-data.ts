// Seed data configuration
// Modify this file to customize seed data

export interface SeedData {
  heats: Array<{
    heatId: string;
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
          timestamp?: string;
        }
      | {
          type: "jump";
          riderId: string;
          scoreUUID: string;
          jumpScore: number;
          jumpType: string;
          timestamp?: string;
        }
    >;
  }>;
}

export const seedData: SeedData = {
  heats: [
    {
      heatId: "demo-heat-1",
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
