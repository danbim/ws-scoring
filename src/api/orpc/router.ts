import {
  createSeason,
  deleteSeason,
  getSeason,
  listSeasons,
  updateSeason,
} from "./routes/seasons.js";

export const appRouter = {
  season: {
    list: listSeasons,
    get: getSeason,
    create: createSeason,
    update: updateSeason,
    delete: deleteSeason,
  },
};

export type AppRouter = typeof appRouter;
