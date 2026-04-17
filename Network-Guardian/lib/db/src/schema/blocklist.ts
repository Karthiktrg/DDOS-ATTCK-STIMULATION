import { pgTable, text, serial, timestamp, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const blocklistTable = pgTable("blocklist", {
  id: serial("id").primaryKey(),
  ip: text("ip").notNull().unique(),
  reason: text("reason").notNull(),
  attackType: text("attack_type"),
  blockedAt: timestamp("blocked_at").defaultNow().notNull(),
  autoBlocked: boolean("auto_blocked").notNull().default(false),
  packetCount: integer("packet_count").notNull().default(0),
});

export const insertBlocklistSchema = createInsertSchema(blocklistTable).omit({ id: true, blockedAt: true });
export type InsertBlocklist = z.infer<typeof insertBlocklistSchema>;
export type Blocklist = typeof blocklistTable.$inferSelect;
