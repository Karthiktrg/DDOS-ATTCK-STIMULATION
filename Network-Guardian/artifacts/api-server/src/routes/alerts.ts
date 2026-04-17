import { Router, type IRouter, type Request, type Response } from "express";
import { db, alertsTable } from "@workspace/db";
import { desc, eq, and } from "drizzle-orm";
import { requireAuth } from "./auth";

const router: IRouter = Router();

router.get("/", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const limit = parseInt(req.query["limit"] as string) || 20;
  const severity = req.query["severity"] as string | undefined;

  let query = db.select().from(alertsTable).orderBy(desc(alertsTable.createdAt));

  let rows;
  if (severity) {
    rows = await db
      .select()
      .from(alertsTable)
      .where(eq(alertsTable.severity, severity))
      .orderBy(desc(alertsTable.createdAt))
      .limit(Math.min(limit, 100));
  } else {
    rows = await db
      .select()
      .from(alertsTable)
      .orderBy(desc(alertsTable.createdAt))
      .limit(Math.min(limit, 100));
  }

  res.json(
    rows.map((r) => ({
      id: r.id,
      type: r.type,
      severity: r.severity,
      sourceIp: r.sourceIp,
      targetPort: r.targetPort,
      message: r.message,
      severityScore: r.severityScore,
      isAcknowledged: r.isAcknowledged,
      autoBlocked: r.autoBlocked,
      createdAt: r.createdAt.toISOString(),
    }))
  );
});

router.post("/:id/acknowledge", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params["id"] ?? "");
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid alert ID" });
    return;
  }

  const updated = await db
    .update(alertsTable)
    .set({ isAcknowledged: true })
    .where(eq(alertsTable.id, id))
    .returning();

  if (updated.length === 0) {
    res.status(404).json({ error: "Alert not found" });
    return;
  }

  const r = updated[0];
  res.json({
    id: r.id,
    type: r.type,
    severity: r.severity,
    sourceIp: r.sourceIp,
    targetPort: r.targetPort,
    message: r.message,
    severityScore: r.severityScore,
    isAcknowledged: r.isAcknowledged,
    autoBlocked: r.autoBlocked,
    createdAt: r.createdAt.toISOString(),
  });
});

export default router;
