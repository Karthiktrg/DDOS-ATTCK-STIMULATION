import { Router, type IRouter, type Request, type Response } from "express";
import { db, blocklistTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";
import { requireAuth } from "./auth";

const router: IRouter = Router();

router.get("/", requireAuth, async (_req: Request, res: Response): Promise<void> => {
  const rows = await db.select().from(blocklistTable).orderBy(desc(blocklistTable.blockedAt));
  res.json(
    rows.map((r) => ({
      id: r.id,
      ip: r.ip,
      reason: r.reason,
      blockedAt: r.blockedAt.toISOString(),
      autoBlocked: r.autoBlocked,
      attackType: r.attackType,
      packetCount: r.packetCount,
    }))
  );
});

router.post("/", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { ip, reason } = req.body;
  if (!ip || !reason) {
    res.status(400).json({ error: "IP and reason are required" });
    return;
  }

  const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (!ipRegex.test(ip)) {
    res.status(400).json({ error: "Invalid IP address format" });
    return;
  }

  const existing = await db.select().from(blocklistTable).where(eq(blocklistTable.ip, ip)).limit(1);
  if (existing.length > 0) {
    res.status(409).json({ error: "IP is already blocked" });
    return;
  }

  const inserted = await db
    .insert(blocklistTable)
    .values({ ip, reason, autoBlocked: false, packetCount: 0 })
    .returning();

  const r = inserted[0];
  res.status(201).json({
    id: r.id,
    ip: r.ip,
    reason: r.reason,
    blockedAt: r.blockedAt.toISOString(),
    autoBlocked: r.autoBlocked,
    attackType: r.attackType,
    packetCount: r.packetCount,
  });
});

router.delete("/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params["id"] ?? "");
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  const deleted = await db.delete(blocklistTable).where(eq(blocklistTable.id, id)).returning();
  if (deleted.length === 0) {
    res.status(404).json({ error: "Blocked IP not found" });
    return;
  }

  res.json({ message: `IP ${deleted[0].ip} has been unblocked` });
});

export default router;
