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
}));

export const bracketsRelations = relations(brackets, ({ one }) => ({
  division: one(divisions, {
    fields: [brackets.divisionId],
    references: [divisions.id],
  }),
}));
