import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
  boolean,
  jsonb,
  varchar,
  date,
} from "drizzle-orm/pg-core";

export const govPrograms = pgTable("gov_programs", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  organization: varchar("organization", { length: 255 }),
  supportAmount: varchar("support_amount", { length: 255 }),
  deadline: date("deadline"),
  applyUrl: text("apply_url"),
  sourceUrl: text("source_url"),
  source: varchar("source", { length: 100 }).notNull(),
  category: varchar("category", { length: 100 }),
  region: varchar("region", { length: 100 }),
  rawData: jsonb("raw_data"),
  status: varchar("status", { length: 50 }).default("active"),
  collectedAt: timestamp("collected_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const matches = pgTable("matches", {
  id: serial("id").primaryKey(),
  programId: integer("program_id")
    .references(() => govPrograms.id)
    .notNull(),
  relevanceScore: integer("relevance_score").notNull(),
  aiSummary: text("ai_summary"),
  matchingPoints: text("matching_points"),
  notified: boolean("notified").default(false),
  bookmarked: boolean("bookmarked").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  matchId: integer("match_id")
    .references(() => matches.id)
    .notNull(),
  channel: varchar("channel", { length: 50 }).default("telegram"),
  sentAt: timestamp("sent_at"),
  status: varchar("status", { length: 50 }).default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type GovProgram = typeof govPrograms.$inferSelect;
export type NewGovProgram = typeof govPrograms.$inferInsert;
export type Match = typeof matches.$inferSelect;
export type NewMatch = typeof matches.$inferInsert;
export type Notification = typeof notifications.$inferSelect;
