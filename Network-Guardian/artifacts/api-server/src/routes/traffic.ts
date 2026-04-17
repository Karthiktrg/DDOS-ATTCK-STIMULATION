import { Router, type IRouter, type Request, type Response } from "express";
import { db, trafficHistoryTable, blocklistTable } from "@workspace/db";
import { desc, gte } from "drizzle-orm";
import { requireAuth } from "./auth";
import { trafficSimulator } from "../lib/traffic-simulator";

const router: IRouter = Router();

router.get("/snapshot", requireAuth, (_req: Request, res: Response): void => {
  const state = trafficSimulator.getState();
  res.json({
    timestamp: new Date().toISOString(),
    packetsPerSecond: state.packetsPerSecond,
    inboundBandwidthMbps: state.inboundBandwidthMbps,
    outboundBandwidthMbps: state.outboundBandwidthMbps,
    totalConnections: state.totalConnections,
    suspiciousCount: state.suspiciousCount,
    blockedCount: state.blockedCount,
    threatLevel: state.threatLevel,
    aiStatus: state.aiStatus,
  });
});

router.get("/history", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const minutes = parseInt(req.query["minutes"] as string) || 30;
  const since = new Date(Date.now() - minutes * 60 * 1000);

  const rows = await db
    .select()
    .from(trafficHistoryTable)
    .where(gte(trafficHistoryTable.timestamp, since))
    .orderBy(desc(trafficHistoryTable.timestamp))
    .limit(200);

  const result = rows.reverse().map((r) => ({
    timestamp: r.timestamp.toISOString(),
    packetsPerSecond: r.packetsPerSecond,
    inboundBandwidthMbps: r.inboundBandwidthMbps,
    outboundBandwidthMbps: r.outboundBandwidthMbps,
    suspiciousCount: r.suspiciousCount,
    attackCount: r.attackCount,
  }));

  res.json(result);
});

router.get("/top-ips", requireAuth, async (_req: Request, res: Response): Promise<void> => {
  const blocked = await db.select({ ip: blocklistTable.ip }).from(blocklistTable);
  const blockedSet = new Set(blocked.map((b) => b.ip));

  const topIps = trafficSimulator.getTopIps(blockedSet).map((entry) => ({
    ip: entry.ip,
    country: entry.country,
    packetsCount: entry.packetsCount,
    bytesCount: entry.bytesCount,
    classification: entry.classification,
    isBlocked: entry.isBlocked ?? false,
    requestsPerSecond: entry.requestsPerSecond,
  }));

  res.json(topIps);
});

router.get("/protocol-distribution", requireAuth, (_req: Request, res: Response): void => {
  const state = trafficSimulator.getState();
  const total = state.packetsPerSecond;

  const isAttacking = trafficSimulator.isAttacking();
  const attackType = trafficSimulator.getAttackType();

  let tcpRatio = 0.55;
  let udpRatio = 0.25;
  let icmpRatio = 0.08;
  let httpRatio = 0.10;
  let otherRatio = 0.02;

  if (isAttacking) {
    if (attackType === "syn_flood" || attackType === "http_flood") {
      tcpRatio = 0.85; udpRatio = 0.05; icmpRatio = 0.02; httpRatio = 0.06; otherRatio = 0.02;
    } else if (attackType === "udp_flood") {
      tcpRatio = 0.10; udpRatio = 0.82; icmpRatio = 0.04; httpRatio = 0.02; otherRatio = 0.02;
    } else if (attackType === "icmp_flood") {
      tcpRatio = 0.15; udpRatio = 0.10; icmpRatio = 0.70; httpRatio = 0.03; otherRatio = 0.02;
    }
  }

  res.json([
    { protocol: "TCP", count: Math.round(total * tcpRatio), percentage: Math.round(tcpRatio * 100), color: "#3b82f6" },
    { protocol: "UDP", count: Math.round(total * udpRatio), percentage: Math.round(udpRatio * 100), color: "#10b981" },
    { protocol: "ICMP", count: Math.round(total * icmpRatio), percentage: Math.round(icmpRatio * 100), color: "#f59e0b" },
    { protocol: "HTTP", count: Math.round(total * httpRatio), percentage: Math.round(httpRatio * 100), color: "#8b5cf6" },
    { protocol: "Other", count: Math.round(total * otherRatio), percentage: Math.round(otherRatio * 100), color: "#6b7280" },
  ]);
});

export default router;
