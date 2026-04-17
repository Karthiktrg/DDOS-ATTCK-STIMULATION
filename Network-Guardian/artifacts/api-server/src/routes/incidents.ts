import { Router, type IRouter, type Request, type Response } from "express";
import { db, incidentsTable } from "@workspace/db";
import { desc } from "drizzle-orm";
import { requireAuth } from "./auth";

const router: IRouter = Router();

router.get("/", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const limit = parseInt(req.query["limit"] as string) || 50;

  const rows = await db
    .select()
    .from(incidentsTable)
    .orderBy(desc(incidentsTable.startedAt))
    .limit(Math.min(limit, 200));

  res.json(
    rows.map((r) => ({
      id: r.id,
      attackType: r.attackType,
      sourceIp: r.sourceIp,
      targetIp: r.targetIp,
      severity: r.severity,
      severityScore: r.severityScore,
      peakPacketsPerSecond: r.peakPacketsPerSecond,
      duration: r.duration,
      wasBlocked: r.wasBlocked,
      status: r.status,
      startedAt: r.startedAt.toISOString(),
      resolvedAt: r.resolvedAt ? r.resolvedAt.toISOString() : null,
    }))
  );
});

router.get("/export", requireAuth, async (_req: Request, res: Response): Promise<void> => {
  const rows = await db
    .select()
    .from(incidentsTable)
    .orderBy(desc(incidentsTable.startedAt))
    .limit(1000);

  const header = [
    "ID",
    "Attack Type",
    "Source IP",
    "Target IP",
    "Severity",
    "Severity Score",
    "Peak PPS",
    "Duration (s)",
    "Was Blocked",
    "Status",
    "Started At",
    "Resolved At",
  ].join(",");

  const csvRows = rows.map((r) =>
    [
      r.id,
      r.attackType,
      r.sourceIp,
      r.targetIp ?? "",
      r.severity,
      r.severityScore,
      r.peakPacketsPerSecond.toFixed(0),
      r.duration,
      r.wasBlocked ? "Yes" : "No",
      r.status,
      r.startedAt.toISOString(),
      r.resolvedAt ? r.resolvedAt.toISOString() : "",
    ].join(",")
  );

  const csv = [header, ...csvRows].join("\n");

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="incidents-${new Date().toISOString().split("T")[0]}.csv"`);
  res.send(csv);
});

export default router;
