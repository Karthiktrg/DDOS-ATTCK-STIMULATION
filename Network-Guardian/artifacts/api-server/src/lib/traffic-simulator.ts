import { logger } from "./logger";

export type TrafficClassification = "normal" | "suspicious" | "attack";
export type ThreatLevel = "normal" | "elevated" | "high" | "critical";
export type AiStatus = "monitoring" | "analyzing" | "detecting" | "blocking";

export interface IpEntry {
  ip: string;
  country: string;
  packetsCount: number;
  bytesCount: number;
  classification: TrafficClassification;
  requestsPerSecond: number;
  lastSeen: Date;
}

export interface TrafficState {
  packetsPerSecond: number;
  inboundBandwidthMbps: number;
  outboundBandwidthMbps: number;
  totalConnections: number;
  suspiciousCount: number;
  blockedCount: number;
  threatLevel: ThreatLevel;
  aiStatus: AiStatus;
  attackMode: boolean;
  attackType: string | null;
}

const COUNTRIES = ["US", "CN", "RU", "DE", "BR", "IN", "FR", "KR", "NL", "UK", "UA", "TR"];

const ATTACK_TYPES = [
  "syn_flood",
  "udp_flood",
  "http_flood",
  "icmp_flood",
  "ddos_attack",
  "port_scan",
  "brute_force",
];

function randomIp(): string {
  const octets = Array.from({ length: 4 }, () => Math.floor(Math.random() * 254) + 1);
  return octets.join(".");
}

function randomBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function randomInt(min: number, max: number): number {
  return Math.floor(randomBetween(min, max));
}

class TrafficSimulator {
  private ipPool: Map<string, IpEntry> = new Map();
  private currentState: TrafficState;
  private attackScheduled = false;
  private attackEndTime: number | null = null;
  private attackIp: string | null = null;

  constructor() {
    this.currentState = {
      packetsPerSecond: randomBetween(800, 1500),
      inboundBandwidthMbps: randomBetween(10, 50),
      outboundBandwidthMbps: randomBetween(5, 20),
      totalConnections: randomInt(200, 500),
      suspiciousCount: 0,
      blockedCount: 0,
      threatLevel: "normal",
      aiStatus: "monitoring",
      attackMode: false,
      attackType: null,
    };

    this.initializeIpPool();
    this.scheduleNextAttack();
  }

  private initializeIpPool(): void {
    for (let i = 0; i < 15; i++) {
      const ip = randomIp();
      this.ipPool.set(ip, {
        ip,
        country: COUNTRIES[randomInt(0, COUNTRIES.length)],
        packetsCount: randomInt(100, 5000),
        bytesCount: randomInt(50000, 2000000),
        classification: "normal",
        requestsPerSecond: randomBetween(0.5, 10),
        lastSeen: new Date(),
      });
    }
  }

  private scheduleNextAttack(): void {
    const delay = randomInt(45000, 90000);
    setTimeout(() => {
      if (!this.currentState.attackMode) {
        this.startAttack();
      }
      this.scheduleNextAttack();
    }, delay);
  }

  private startAttack(): void {
    const attackType = ATTACK_TYPES[randomInt(0, ATTACK_TYPES.length)];
    this.attackIp = randomIp();
    const duration = randomInt(15000, 45000);

    logger.info({ attackType, ip: this.attackIp }, "Simulated attack started");

    this.currentState.attackMode = true;
    this.currentState.attackType = attackType;
    this.currentState.aiStatus = "detecting";
    this.attackEndTime = Date.now() + duration;

    const attackerEntry: IpEntry = {
      ip: this.attackIp,
      country: COUNTRIES[randomInt(0, COUNTRIES.length)],
      packetsCount: 0,
      bytesCount: 0,
      classification: "attack",
      requestsPerSecond: randomBetween(500, 5000),
      lastSeen: new Date(),
    };
    this.ipPool.set(this.attackIp, attackerEntry);
  }

  private endAttack(): void {
    logger.info({ ip: this.attackIp }, "Simulated attack ended");
    this.currentState.attackMode = false;
    this.currentState.attackType = null;
    this.currentState.aiStatus = "monitoring";
    this.currentState.threatLevel = "normal";
    this.attackEndTime = null;

    if (this.attackIp) {
      const entry = this.ipPool.get(this.attackIp);
      if (entry) {
        entry.classification = "normal";
        entry.requestsPerSecond = randomBetween(0.5, 10);
      }
    }
    this.attackIp = null;
  }

  tick(): void {
    const now = Date.now();

    if (this.currentState.attackMode && this.attackEndTime && now > this.attackEndTime) {
      this.endAttack();
    }

    if (this.currentState.attackMode) {
      const progress = this.attackEndTime ? Math.max(0, 1 - ((this.attackEndTime - now) / 30000)) : 1;
      const intensity = Math.min(Math.max(progress * 2, 0), 1);

      this.currentState.packetsPerSecond = randomBetween(
        8000 + intensity * 40000,
        15000 + intensity * 80000
      );
      this.currentState.inboundBandwidthMbps = randomBetween(200 + intensity * 300, 400 + intensity * 500);
      this.currentState.outboundBandwidthMbps = randomBetween(20, 80);
      this.currentState.totalConnections = randomInt(5000 + intensity * 15000, 10000 + intensity * 30000);
      this.currentState.suspiciousCount = randomInt(50, 200);
      this.currentState.blockedCount = randomInt(10, 80);

      const scoreVal = intensity;
      if (scoreVal < 0.3) {
        this.currentState.threatLevel = "elevated";
        this.currentState.aiStatus = "analyzing";
      } else if (scoreVal < 0.7) {
        this.currentState.threatLevel = "high";
        this.currentState.aiStatus = "detecting";
      } else {
        this.currentState.threatLevel = "critical";
        this.currentState.aiStatus = "blocking";
      }

      if (this.attackIp) {
        const entry = this.ipPool.get(this.attackIp);
        if (entry) {
          entry.packetsCount += randomInt(5000, 30000);
          entry.bytesCount += randomInt(500000, 5000000);
          entry.requestsPerSecond = randomBetween(500 + intensity * 4500, 1000 + intensity * 9000);
          entry.classification = "attack";
          entry.lastSeen = new Date();
        }
      }
    } else {
      this.currentState.packetsPerSecond = randomBetween(800, 1800);
      this.currentState.inboundBandwidthMbps = randomBetween(10, 60);
      this.currentState.outboundBandwidthMbps = randomBetween(5, 25);
      this.currentState.totalConnections = randomInt(200, 600);
      this.currentState.suspiciousCount = randomInt(0, 5);
      this.currentState.blockedCount = randomInt(0, 3);
      this.currentState.threatLevel = "normal";
      this.currentState.aiStatus = "monitoring";
    }

    for (const [ip, entry] of this.ipPool.entries()) {
      if (ip !== this.attackIp) {
        entry.packetsCount += randomInt(1, 50);
        entry.bytesCount += randomInt(100, 5000);
        entry.requestsPerSecond = randomBetween(0.5, 15);
        entry.lastSeen = new Date();

        if (Math.random() < 0.01) {
          entry.classification = "suspicious";
        } else if (entry.classification === "suspicious" && Math.random() < 0.1) {
          entry.classification = "normal";
        }
      }
    }

    if (Math.random() < 0.05 && this.ipPool.size < 30) {
      const ip = randomIp();
      if (!this.ipPool.has(ip)) {
        this.ipPool.set(ip, {
          ip,
          country: COUNTRIES[randomInt(0, COUNTRIES.length)],
          packetsCount: randomInt(10, 500),
          bytesCount: randomInt(1000, 50000),
          classification: "normal",
          requestsPerSecond: randomBetween(0.5, 10),
          lastSeen: new Date(),
        });
      }
    }
  }

  getState(): TrafficState {
    return { ...this.currentState };
  }

  getTopIps(blockedIps: Set<string>): IpEntry[] {
    const entries = Array.from(this.ipPool.values())
      .sort((a, b) => b.packetsCount - a.packetsCount)
      .slice(0, 20)
      .map((e) => ({
        ...e,
        isBlocked: blockedIps.has(e.ip),
      }));
    return entries;
  }

  getAttackIp(): string | null {
    return this.attackIp;
  }

  getAttackType(): string | null {
    return this.currentState.attackType;
  }

  isAttacking(): boolean {
    return this.currentState.attackMode;
  }
}

export const trafficSimulator = new TrafficSimulator();

setInterval(() => {
  trafficSimulator.tick();
}, 1000);
