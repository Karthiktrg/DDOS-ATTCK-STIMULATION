import { pgTable, text, serial, timestamp, boolean, real, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const incidentsTable = pgTable("incidents", {
  id: serial("id").primaryKey(),
  attackType: text("attack_type").notNull(),
  sourceIp: text("source_ip").notNull(),
  targetIp: text("target_ip"),
  severity: text("severity").notNull(),
  severityScore: real("severity_score").notNull().default(0),
  peakPacketsPerSecond: real("peak_packets_per_second").notNull().default(0),
  duration: integer("duration").notNull().default(0),
  wasBlocked: boolean("was_blocked").notNull().default(false),
  status: text("status").notNull().default("resolved"),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  resolvedAt: timestamp("resolved_at"),
});

export const insertIncidentSchema = createInsertSchema(incidentsTable).omit({ id: true });
export type InsertIncident = z.infer<typeof insertIncidentSchema>;
export type Incident = typeof incidentsTable.$inferSelect;
