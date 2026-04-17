import { pgTable, serial, timestamp, real, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const trafficHistoryTable = pgTable("traffic_history", {
  id: serial("id").primaryKey(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  packetsPerSecond: real("packets_per_second").notNull().default(0),
  inboundBandwidthMbps: real("inbound_bandwidth_mbps").notNull().default(0),
  outboundBandwidthMbps: real("outbound_bandwidth_mbps").notNull().default(0),
  suspiciousCount: integer("suspicious_count").notNull().default(0),
  attackCount: integer("attack_count").notNull().default(0),
});

export const insertTrafficHistorySchema = createInsertSchema(trafficHistoryTable).omit({ id: true });
export type InsertTrafficHistory = z.infer<typeof insertTrafficHistorySchema>;
export type TrafficHistory = typeof trafficHistoryTable.$inferSelect;
