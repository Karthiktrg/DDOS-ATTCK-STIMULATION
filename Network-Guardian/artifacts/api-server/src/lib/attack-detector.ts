import { db, alertsTable, blocklistTable, incidentsTable, trafficHistoryTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { trafficSimulator } from "./traffic-simulator";
import { analyzeTraffic } from "./ai-engine";
import { logger } from "./logger";

let activeIncidentId: number | null = null;
let incidentPeakPps = 0;
let incidentStart: Date | null = null;

async function runDetectionCycle(): Promise<void> {
  const state = trafficSimulator.getState();
  const analysis = analyzeTraffic(state);

  await db.insert(trafficHistoryTable).values({
    packetsPerSecond: state.packetsPerSecond,
    inboundBandwidthMbps: state.inboundBandwidthMbps,
    outboundBandwidthMbps: state.outboundBandwidthMbps,
    suspiciousCount: state.suspiciousCount,
    attackCount: analysis.classification === "attack" ? 1 : 0,
  });

  if (analysis.isAnomaly && analysis.classification === "attack") {
    const attackIp = trafficSimulator.getAttackIp();
    const attackType = trafficSimulator.getAttackType() ?? "ddos_attack";

    if (attackIp) {
      const existingBlock = await db
        .select()
        .from(blocklistTable)
        .where(eq(blocklistTable.ip, attackIp))
        .limit(1);

      if (existingBlock.length === 0) {
        await db.insert(blocklistTable).values({
          ip: attackIp,
          reason: `Auto-blocked: ${attackType} detected by AI engine`,
          attackType,
          autoBlocked: true,
          packetCount: Math.round(state.packetsPerSecond),
        });
        logger.info({ ip: attackIp, attackType }, "Auto-blocked attack IP");
      }
    }

    const severity =
      analysis.severityScore >= 80
        ? "critical"
        : analysis.severityScore >= 60
        ? "high"
        : analysis.severityScore >= 40
        ? "medium"
        : "low";

    await db.insert(alertsTable).values({
      type: attackType as "ddos_attack",
      severity,
      sourceIp: attackIp ?? state.suspiciousCount > 0 ? (attackIp ?? "0.0.0.0") : "0.0.0.0",
      targetPort: attackType === "syn_flood" ? 80 : attackType === "http_flood" ? 443 : null,
      message: `${attackType.replace(/_/g, " ").toUpperCase()} detected from ${attackIp ?? "multiple sources"}. Peak traffic: ${Math.round(state.packetsPerSecond).toLocaleString()} pps. Severity score: ${analysis.severityScore}/100`,
      severityScore: analysis.severityScore,
      isAcknowledged: false,
      autoBlocked: attackIp !== null,
    });

    if (activeIncidentId === null) {
      incidentStart = new Date();
      incidentPeakPps = state.packetsPerSecond;

      const incident = await db
        .insert(incidentsTable)
        .values({
          attackType,
          sourceIp: attackIp ?? "distributed",
          targetIp: "192.168.1.1",
          severity,
          severityScore: analysis.severityScore,
          peakPacketsPerSecond: state.packetsPerSecond,
          duration: 0,
          wasBlocked: attackIp !== null,
          status: "active",
          startedAt: new Date(),
        })
        .returning();

      activeIncidentId = incident[0].id;
    } else {
      incidentPeakPps = Math.max(incidentPeakPps, state.packetsPerSecond);
    }
  } else if (activeIncidentId !== null) {
    const now = new Date();
    const duration = incidentStart
      ? Math.round((now.getTime() - incidentStart.getTime()) / 1000)
      : 0;

    await db
      .update(incidentsTable)
      .set({
        status: "resolved",
        resolvedAt: now,
        duration,
        peakPacketsPerSecond: incidentPeakPps,
      })
      .where(eq(incidentsTable.id, activeIncidentId));

    logger.info({ incidentId: activeIncidentId, duration }, "Incident resolved");
    activeIncidentId = null;
    incidentStart = null;
    incidentPeakPps = 0;
  }
}

export function startAttackDetector(): void {
  setInterval(() => {
    runDetectionCycle().catch((err) =>
      logger.error({ err }, "Attack detector error")
    );
  }, 5000);

  logger.info("Attack detector started");
}
