import { relations } from "drizzle-orm";
import { date, index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    username: text("username").notNull().unique(),
    email: text("email"),
    passwordHash: text("password_hash").notNull(),
    role: text("role").notNull(), // 'judge', 'head_judge', 'administrator'
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    usernameIdx: index("username_idx").on(table.username),
    emailIdx: index("email_idx").on(table.email),
  })
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    token: uuid("token").defaultRandom().notNull().unique(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    tokenIdx: index("token_idx").on(table.token),
    userIdIdx: index("user_id_idx").on(table.userId),
    expiresAtIdx: index("expires_at_idx").on(table.expiresAt),
  })
);

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const seasons = pgTable(
  "seasons",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    year: integer("year").notNull(),
    startDate: date("start_date", { mode: "date" }).notNull(),
    endDate: date("end_date", { mode: "date" }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    yearIdx: index("year_idx").on(table.year),
  })
);

export const contests = pgTable(
  "contests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    seasonId: uuid("season_id")
      .notNull()
      .references(() => seasons.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    location: text("location").notNull(),
    startDate: date("start_date", { mode: "date" }).notNull(),
    endDate: date("end_date", { mode: "date" }).notNull(),
    status: text("status").notNull(), // 'draft', 'scheduled', 'in_progress', 'completed', 'cancelled'
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    seasonIdIdx: index("season_id_idx").on(table.seasonId),
    statusIdx: index("status_idx").on(table.status),
  })
);

export const divisions = pgTable(
  "divisions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    contestId: uuid("contest_id")
      .notNull()
      .references(() => contests.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    category: text("category").notNull(), // 'pro_men', 'pro_women', etc.
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    contestIdIdx: index("contest_id_idx").on(table.contestId),
    categoryIdx: index("category_idx").on(table.category),
  })
);

export const brackets = pgTable(
  "brackets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    divisionId: uuid("division_id")
      .notNull()
      .references(() => divisions.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    format: text("format").notNull(), // 'single_elimination', 'double_elimination', 'dingle'
    status: text("status").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    divisionIdIdx: index("division_id_idx").on(table.divisionId),
    formatIdx: index("format_idx").on(table.format),
  })
);

// Relations
export const seasonsRelations = relations(seasons, ({ many }) => ({
  contests: many(contests),
}));

export const contestsRelations = relations(contests, ({ one, many }) => ({
  season: one(seasons, {
    fields: [contests.seasonId],
    references: [seasons.id],
  }),
  divisions: many(divisions),
}));

export const divisionsRelations = relations(divisions, ({ one, many }) => ({
  contest: one(contests, {
    fields: [divisions.contestId],
    references: [contests.id],
  }),
  brackets: many(brackets),
  participants: many(divisionParticipants),
}));

export const bracketsRelations = relations(brackets, ({ one, many }) => ({
  division: one(divisions, {
    fields: [brackets.divisionId],
    references: [divisions.id],
  }),
  heats: many(heats),
}));

export const heats = pgTable(
  "heats",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    heatId: text("heat_id").notNull().unique(),
    bracketId: uuid("bracket_id")
      .notNull()
      .references(() => brackets.id, { onDelete: "cascade" }),
    riderIds: text("rider_ids").notNull(), // JSON array of rider IDs
    wavesCounting: integer("waves_counting").notNull(),
    jumpsCounting: integer("jumps_counting").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    heatIdIdx: index("heat_id_idx").on(table.heatId),
    bracketIdIdx: index("bracket_id_idx").on(table.bracketId),
  })
);

export const heatsRelations = relations(heats, ({ one }) => ({
  bracket: one(brackets, {
    fields: [heats.bracketId],
    references: [brackets.id],
  }),
}));

export const riders = pgTable(
  "riders",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    country: text("country").notNull(),
    sailNumber: text("sail_number"),
    email: text("email"),
    dateOfBirth: date("date_of_birth", { mode: "date" }),
    deletedAt: timestamp("deleted_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    countryIdx: index("country_idx").on(table.country),
    sailNumberIdx: index("sail_number_idx").on(table.sailNumber),
    deletedAtIdx: index("deleted_at_idx").on(table.deletedAt),
  })
);

export const divisionParticipants = pgTable(
  "division_participants",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    divisionId: uuid("division_id")
      .notNull()
      .references(() => divisions.id, { onDelete: "cascade" }),
    riderId: uuid("rider_id")
      .notNull()
      .references(() => riders.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    divisionIdIdx: index("division_participant_division_id_idx").on(table.divisionId),
    riderIdIdx: index("division_participant_rider_id_idx").on(table.riderId),
    uniqueDivisionRider: index("unique_division_rider_idx").on(table.divisionId, table.riderId),
  })
);

// Relations
export const ridersRelations = relations(riders, ({ many }) => ({
  divisionParticipants: many(divisionParticipants),
}));

export const divisionParticipantsRelations = relations(divisionParticipants, ({ one }) => ({
  division: one(divisions, {
    fields: [divisionParticipants.divisionId],
    references: [divisions.id],
  }),
  rider: one(riders, {
    fields: [divisionParticipants.riderId],
    references: [riders.id],
  }),
}));
