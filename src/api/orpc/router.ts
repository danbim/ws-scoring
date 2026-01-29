import { login, logout, me } from "./routes/auth.js";
import {
  createBracket,
  deleteBracket,
  generate,
  getWithHeats,
  listBrackets,
  updateBracket,
} from "./routes/brackets.js";
import {
  createContest,
  deleteContest,
  getContest,
  listContests,
  updateContest,
} from "./routes/contests.js";
import {
  createDivision,
  deleteDivision,
  getDivision,
  listDivisions,
  updateDivision,
} from "./routes/divisions.js";
import {
  completeHeat,
  createHeat,
  deleteHeat,
  getHeadJudge,
  getHeat,
  getViewer,
  listHeats,
  updateHeat,
} from "./routes/heats.js";
import { addParticipant, listParticipants, removeParticipant } from "./routes/participants.js";
import { createRider, deleteRider, getRider, listRiders, updateRider } from "./routes/riders.js";
import {
  addJump,
  addWave,
  deleteJump,
  deleteWave,
  updateJump,
  updateWave,
} from "./routes/scores.js";
import {
  createSeason,
  deleteSeason,
  getSeason,
  listSeasons,
  updateSeason,
} from "./routes/seasons.js";

export const appRouter = {
  auth: {
    login,
    logout,
    me,
  },
  season: {
    list: listSeasons,
    get: getSeason,
    create: createSeason,
    update: updateSeason,
    delete: deleteSeason,
  },
  contest: {
    list: listContests,
    get: getContest,
    create: createContest,
    update: updateContest,
    delete: deleteContest,
  },
  division: {
    list: listDivisions,
    get: getDivision,
    create: createDivision,
    update: updateDivision,
    delete: deleteDivision,
  },
  bracket: {
    list: listBrackets,
    getWithHeats,
    create: createBracket,
    update: updateBracket,
    delete: deleteBracket,
    generate,
  },
  rider: {
    list: listRiders,
    get: getRider,
    create: createRider,
    update: updateRider,
    delete: deleteRider,
  },
  participant: {
    list: listParticipants,
    add: addParticipant,
    remove: removeParticipant,
  },
  heat: {
    list: listHeats,
    get: getHeat,
    create: createHeat,
    update: updateHeat,
    delete: deleteHeat,
    complete: completeHeat,
    getViewer,
    getHeadJudge,
  },
  score: {
    addWave,
    updateWave,
    deleteWave,
    addJump,
    updateJump,
    deleteJump,
  },
};

export type AppRouter = typeof appRouter;
