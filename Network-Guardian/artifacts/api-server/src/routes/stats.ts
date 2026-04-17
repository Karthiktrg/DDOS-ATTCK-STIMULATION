import { Router, type IRouter, type Request, type Response } from "express";
import { db, alertsTable, blocklistTable, incidentsTable } from "@workspace/db";
import { gte, sql, eq } from "drizzle-orm";
import { requireAuth } from "./auth";
import { trafficSimulator } from "../lib/traffic-simulator";

const router: IRouter = Router();

router.get("/dashboard", requireAuth, async (_req: Request, res: Response): Promise<void> => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [alertsToday, blockedIps, incidents] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)` })
      .from(alertsTable)
      .where(gte(alertsTable.createdAt, today)),
    db.select({ count: sql<number>`count(*)` }).from(blocklistTable),
    db
      .select({ count: sql<number>`count(*)` })
      .from(incidentsTable)
      .where(gte(incidentsTable.startedAt, today)),
  ]);

  const attacksPrevented = await db
    .select({ count: sql<number>`count(*)` })
    .from(incidentsTable)
    .where(eq(incidentsTable.wasBlocked, true));

  const state = trafficSimulator.getState();
  const pps = Math.max(0, state.packetsPerSecond);
  const totalPacketsEstimate = Math.round(pps * 3600 * (8 + Math.random() * 4));

  res.json({
    totalPacketsToday: totalPacketsEstimate,
    totalAlertsToday: Number(alertsToday[0]?.count ?? 0),
    totalBlockedIps: Number(blockedIps[0]?.count ?? 0),
    attacksDetectedToday: Number(incidents[0]?.count ?? 0),
    attacksPrevented: Number(attacksPrevented[0]?.count ?? 0),
    avgSeverityScore: parseFloat((35 + Math.random() * 20).toFixed(1)),
    uptimePercent: parseFloat((99.1 + Math.random() * 0.8).toFixed(2)),
    aiAccuracyPercent: parseFloat((94.5 + Math.random() * 4).toFixed(1)),
  });
});

router.get("/system-health", requireAuth, (_req: Request, res: Response): void => {
  const state = trafficSimulator.getState();
  const isAttacking = trafficSimulator.isAttacking();

  res.json({
    cpuUsagePercent: parseFloat(
      (isAttacking ? 60 + Math.random() * 35 : 15 + Math.random() * 25).toFixed(1)
    ),
    memoryUsagePercent: parseFloat((35 + Math.random() * 20).toFixed(1)),
    networkInterfaceStatus: "up",
    captureEngineStatus: "active",
    aiModelStatus: "loaded",
    databaseStatus: "connected",
    lastModelUpdateAt: new Date(Date.now() - 3600000).toISOString(),
    packetDropRate: parseFloat((isAttacking ? 0.5 + Math.random() * 5 : Math.random() * 0.1).toFixed(3)),
  });
});

export default router;
