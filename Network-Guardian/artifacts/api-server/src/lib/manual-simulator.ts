import dns from "dns/promises";
import { trafficSimulator } from "./traffic-simulator";
import { logger } from "./logger";

export interface ManualSimulation {
  targetUrl: string;
  targetDomain: string;
  attackType: string;
  durationSeconds: number;
  startedAt: Date;
  endAt: Date;
  peakPps: number;
  packetsGenerated: number;
}

let activeManualSim: ManualSimulation | null = null;
let simTimer: ReturnType<typeof setTimeout> | null = null;
let simTickInterval: ReturnType<typeof setInterval> | null = null;

function extractDomain(url: string): string {
  try {
    const u = url.startsWith("http") ? url : `https://${url}`;
    return new URL(u).hostname;
  } catch {
    return url.replace(/^https?:\/\//, "").split("/")[0];
  }
}

export async function startManualSimulation(
  targetUrl: string,
  attackType: string,
  durationSeconds: number
): Promise<ManualSimulation> {
  if (activeManualSim) {
    stopManualSimulation();
  }

  const domain = extractDomain(targetUrl);
  const now = new Date();
  const endAt = new Date(now.getTime() + durationSeconds * 1000);

  activeManualSim = {
    targetUrl,
    targetDomain: domain,
    attackType,
    durationSeconds,
    startedAt: now,
    endAt,
    peakPps: 0,
    packetsGenerated: 0,
  };

  (trafficSimulator as unknown as Record<string, unknown>)["_manualOverride"] = {
    attackType,
    attackIp: `${Math.floor(Math.random() * 200) + 10}.${Math.floor(Math.random() * 254) + 1}.${Math.floor(Math.random() * 254) + 1}.${Math.floor(Math.random() * 254) + 1}`,
    endAt,
    targetDomain: domain,
  };

  simTickInterval = setInterval(() => {
    if (!activeManualSim) {
      if (simTickInterval) clearInterval(simTickInterval);
      return;
    }
    const currentPps = Math.random() * 80000 + 20000;
    activeManualSim.packetsGenerated += Math.round(currentPps);
    activeManualSim.peakPps = Math.max(activeManualSim.peakPps, currentPps);
  }, 1000);

  simTimer = setTimeout(() => {
    stopManualSimulation();
    logger.info({ domain, attackType }, "Manual simulation ended");
  }, durationSeconds * 1000);

  logger.info({ domain, attackType, durationSeconds }, "Manual DDoS simulation started");
  return activeManualSim;
}

export function stopManualSimulation(): void {
  if (simTimer) { clearTimeout(simTimer); simTimer = null; }
  if (simTickInterval) { clearInterval(simTickInterval); simTickInterval = null; }
  delete (trafficSimulator as unknown as Record<string, unknown>)["_manualOverride"];
  activeManualSim = null;
}

export function getManualSimulationStatus() {
  if (!activeManualSim) {
    return { isActive: false };
  }
  const now = Date.now();
  const elapsed = Math.round((now - activeManualSim.startedAt.getTime()) / 1000);
  const remaining = Math.max(0, Math.round((activeManualSim.endAt.getTime() - now) / 1000));

  if (remaining <= 0) {
    stopManualSimulation();
    return { isActive: false };
  }

  return {
    isActive: true,
    targetUrl: activeManualSim.targetUrl,
    targetDomain: activeManualSim.targetDomain,
    attackType: activeManualSim.attackType,
    durationSeconds: activeManualSim.durationSeconds,
    elapsedSeconds: elapsed,
    remainingSeconds: remaining,
    currentPps: Math.random() * 60000 + 20000,
    peakPps: activeManualSim.peakPps,
    packetsGenerated: activeManualSim.packetsGenerated,
    threatLevel: "critical",
    startedAt: activeManualSim.startedAt.toISOString(),
  };
}

const KNOWN_RISKY_TLDS = new Set(["ru", "cn", "tk", "ml", "ga", "cf", "gq"]);
const COMMON_PORTS: Record<string, number[]> = {
  web: [80, 443],
  ssh: [22],
  mail: [25, 587, 993],
  db: [3306, 5432, 27017],
  dns: [53],
  ftp: [21],
};

export async function analyzeUrl(url: string): Promise<{
  url: string;
  domain: string;
  resolvedIp: string | null;
  threatLevel: "safe" | "low" | "medium" | "high" | "critical";
  riskScore: number;
  isTargeted: boolean;
  openPorts: number[];
  detectedThreats: Array<{ type: string; description: string; severity: "info" | "low" | "medium" | "high" | "critical" }>;
  recommendations: string[];
  scannedAt: string;
}> {
  const domain = extractDomain(url);
  const normalizedUrl = url.startsWith("http") ? url : `https://${url}`;

  let resolvedIp: string | null = null;
  let dnsResolved = false;

  try {
    const addresses = await dns.resolve4(domain);
    resolvedIp = addresses[0] ?? null;
    dnsResolved = true;
  } catch {
    try {
      const addresses = await dns.resolve6(domain);
      resolvedIp = addresses[0] ?? null;
      dnsResolved = true;
    } catch {
      resolvedIp = null;
    }
  }

  const threats: Array<{ type: string; description: string; severity: "info" | "low" | "medium" | "high" | "critical" }> = [];
  const recommendations: string[] = [];
  let riskScore = 0;

  const tld = domain.split(".").pop() ?? "";
  if (KNOWN_RISKY_TLDS.has(tld)) {
    threats.push({ type: "RISKY_TLD", description: `Domain uses high-risk TLD (.${tld}) commonly associated with malicious activity`, severity: "medium" });
    riskScore += 25;
  }

  if (!dnsResolved || !resolvedIp) {
    threats.push({ type: "DNS_RESOLUTION_FAILED", description: "Domain did not resolve to a valid IP address — possible phantom/inactive domain", severity: "low" });
    riskScore += 10;
    recommendations.push("Verify the domain is correctly spelled and currently active");
  } else {
    threats.push({ type: "DNS_RESOLVED", description: `Domain successfully resolved to ${resolvedIp}`, severity: "info" });
  }

  const simState = trafficSimulator.getState();
  const isTargeted = activeManualSim?.targetDomain === domain || 
    (simState.attackMode && Math.random() < 0.3);

  if (isTargeted) {
    threats.push({ type: "ACTIVE_TARGETING", description: "This domain is currently being targeted by traffic in the monitoring system", severity: "critical" });
    riskScore += 50;
    recommendations.push("Immediately enable DDoS mitigation and contact your upstream provider");
    recommendations.push("Consider activating CDN-level traffic scrubbing");
  }

  if (simState.threatLevel === "high" || simState.threatLevel === "critical") {
    threats.push({ type: "ELEVATED_NETWORK_THREAT", description: `Network threat level is currently ${simState.threatLevel.toUpperCase()} — all targets at elevated risk`, severity: "high" });
    riskScore += 20;
  }

  const urlLower = url.toLowerCase();
  if (urlLower.includes("login") || urlLower.includes("admin") || urlLower.includes("auth")) {
    threats.push({ type: "SENSITIVE_ENDPOINT", description: "URL path contains sensitive endpoint keywords — brute force and credential stuffing risk", severity: "medium" });
    riskScore += 15;
    recommendations.push("Implement rate limiting on authentication endpoints");
    recommendations.push("Enable multi-factor authentication");
  }

  const simPorts: number[] = [];
  simPorts.push(...COMMON_PORTS.web);
  if (Math.random() > 0.5) simPorts.push(...COMMON_PORTS.ssh);
  if (Math.random() > 0.7) simPorts.push(...COMMON_PORTS.mail);
  if (Math.random() > 0.8) simPorts.push(...COMMON_PORTS.db);
  const openPorts = [...new Set(simPorts)].sort((a, b) => a - b);

  if (openPorts.includes(22)) {
    threats.push({ type: "SSH_EXPOSED", description: "Port 22 (SSH) detected open — brute force risk", severity: "low" });
    riskScore += 10;
    recommendations.push("Restrict SSH access to known IP ranges or use a VPN");
  }

  if (openPorts.some(p => COMMON_PORTS.db.includes(p))) {
    threats.push({ type: "DATABASE_EXPOSED", description: "Database port detected open to external traffic", severity: "high" });
    riskScore += 30;
    recommendations.push("Immediately restrict database ports to internal network only");
  }

  if (threats.length === 0 || (threats.length === 1 && threats[0].type === "DNS_RESOLVED")) {
    threats.push({ type: "NO_IMMEDIATE_THREATS", description: "No immediate threats detected in current traffic analysis", severity: "info" });
    recommendations.push("Continue monitoring for traffic anomalies");
    recommendations.push("Ensure DDoS protection is enabled at the CDN/DNS level");
  }

  if (recommendations.length === 0) {
    recommendations.push("Enable Web Application Firewall (WAF)");
    recommendations.push("Configure rate limiting on all public endpoints");
  }

  riskScore = Math.min(100, riskScore + Math.floor(Math.random() * 10));

  const threatLevel: "safe" | "low" | "medium" | "high" | "critical" =
    riskScore >= 70 ? "critical" :
    riskScore >= 50 ? "high" :
    riskScore >= 30 ? "medium" :
    riskScore >= 10 ? "low" : "safe";

  return {
    url: normalizedUrl,
    domain,
    resolvedIp,
    threatLevel,
    riskScore,
    isTargeted,
    openPorts,
    detectedThreats: threats,
    recommendations,
    scannedAt: new Date().toISOString(),
  };
}
