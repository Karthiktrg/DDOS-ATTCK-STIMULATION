import { db, usersTable, alertsTable, blocklistTable, incidentsTable, trafficHistoryTable } from "@workspace/db";
import { sql } from "drizzle-orm";
import crypto from "crypto";
import { logger } from "./logger";

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password + "ddos_salt_2024").digest("hex");
}

function randomIp(): string {
  return `${randomInt(1, 254)}.${randomInt(1, 254)}.${randomInt(1, 254)}.${randomInt(1, 254)}`;
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min) + min);
}

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

const ATTACK_TYPES = [
  "syn_flood", "udp_flood", "http_flood", "icmp_flood",
  "ddos_attack", "port_scan", "brute_force",
];

const SEVERITIES = ["low", "medium", "high", "critical"] as const;
const COUNTRIES = ["US", "CN", "RU", "DE", "BR", "IN", "FR", "KR"];

export async function seedDatabase(): Promise<void> {
  const userCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(usersTable);

  if (Number(userCount[0]?.count) > 0) {
    logger.info("Database already seeded, skipping");
    return;
  }

  logger.info("Seeding database...");

  await db.insert(usersTable).values([
    {
      username: "admin",
      passwordHash: hashPassword("admin123"),
      role: "admin",
    },
    {
      username: "analyst",
      passwordHash: hashPassword("analyst123"),
      role: "analyst",
    },
    {
      username: "viewer",
      passwordHash: hashPassword("viewer123"),
      role: "viewer",
    },
  ]);

  const now = Date.now();
  const trafficRows = [];
  for (let i = 60; i >= 0; i--) {
    const ts = new Date(now - i * 30000);
    const isSpike = i > 20 && i < 35;
    trafficRows.push({
      timestamp: ts,
      packetsPerSecond: isSpike ? randomInt(15000, 80000) : randomInt(800, 2000),
      inboundBandwidthMbps: isSpike ? randomInt(200, 600) : randomInt(10, 60),
      outboundBandwidthMbps: randomInt(5, 30),
      suspiciousCount: isSpike ? randomInt(50, 200) : randomInt(0, 5),
      attackCount: isSpike ? randomInt(1, 5) : 0,
    });
  }
  await db.insert(trafficHistoryTable).values(trafficRows);

  const alertRows = [];
  for (let i = 0; i < 30; i++) {
    const attackType = randomFrom(ATTACK_TYPES);
    const severity = randomFrom(SEVERITIES);
    const score = severity === "critical" ? randomInt(80, 100)
      : severity === "high" ? randomInt(60, 79)
      : severity === "medium" ? randomInt(40, 59)
      : randomInt(10, 39);
    const srcIp = randomIp();
    alertRows.push({
      type: attackType as "ddos_attack",
      severity,
      sourceIp: srcIp,
      targetPort: randomFrom([80, 443, 22, 3306, null, null]),
      message: `${attackType.replace(/_/g, " ").toUpperCase()} detected from ${srcIp}. AI confidence: ${randomInt(85, 99)}%. Severity score: ${score}/100`,
      severityScore: score,
      isAcknowledged: Math.random() > 0.6,
      autoBlocked: Math.random() > 0.5,
      createdAt: new Date(now - randomInt(0, 86400000)),
    });
  }
  await db.insert(alertsTable).values(alertRows);

  const blocklistRows = [];
  const usedIps = new Set<string>();
  for (let i = 0; i < 15; i++) {
    let ip = randomIp();
    while (usedIps.has(ip)) ip = randomIp();
    usedIps.add(ip);
    const attackType = randomFrom(ATTACK_TYPES);
    blocklistRows.push({
      ip,
      reason: `Auto-blocked: ${attackType.replace(/_/g, " ")} detected`,
      attackType,
      autoBlocked: Math.random() > 0.3,
      packetCount: randomInt(10000, 5000000),
    });
  }
  await db.insert(blocklistTable).values(blocklistRows);

  const incidentRows = [];
  for (let i = 0; i < 20; i++) {
    const attackType = randomFrom(ATTACK_TYPES);
    const severity = randomFrom(SEVERITIES);
    const score = severity === "critical" ? randomInt(80, 100)
      : severity === "high" ? randomInt(60, 79)
      : severity === "medium" ? randomInt(40, 59)
      : randomInt(10, 39);
    const startedAt = new Date(now - randomInt(3600000, 604800000));
    const duration = randomInt(30, 3600);
    const resolvedAt = new Date(startedAt.getTime() + duration * 1000);
    incidentRows.push({
      attackType,
      sourceIp: randomIp(),
      targetIp: `192.168.${randomInt(1, 10)}.${randomInt(1, 50)}`,
      severity,
      severityScore: score,
      peakPacketsPerSecond: randomInt(5000, 100000),
      duration,
      wasBlocked: Math.random() > 0.2,
      status: "resolved" as "resolved",
      startedAt,
      resolvedAt,
    });
  }
  await db.insert(incidentsTable).values(incidentRows);

  logger.info("Database seeding complete");
}
