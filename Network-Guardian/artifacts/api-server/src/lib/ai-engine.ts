import { trafficSimulator, type TrafficState } from "./traffic-simulator";

export interface AnomalyResult {
  isAnomaly: boolean;
  classification: "normal" | "suspicious" | "attack";
  confidence: number;
  attackType: string | null;
  severityScore: number;
}

function isolationForestScore(state: TrafficState): number {
  const normalPps = 1300;
  const normalBw = 35;
  const normalConns = 400;

  const ppsAnomaly = Math.max(0, (state.packetsPerSecond - normalPps * 3) / (normalPps * 10));
  const bwAnomaly = Math.max(0, (state.inboundBandwidthMbps - normalBw * 4) / (normalBw * 10));
  const connAnomaly = Math.max(0, (state.totalConnections - normalConns * 5) / (normalConns * 15));
  const suspAnomaly = state.suspiciousCount > 10 ? state.suspiciousCount / 200 : 0;

  const rawScore =
    ppsAnomaly * 0.35 +
    bwAnomaly * 0.3 +
    connAnomaly * 0.2 +
    suspAnomaly * 0.15;

  return Math.min(rawScore, 1.0);
}

export function analyzeTraffic(state: TrafficState): AnomalyResult {
  const score = isolationForestScore(state);

  let classification: "normal" | "suspicious" | "attack" = "normal";
  let isAnomaly = false;
  let attackType: string | null = null;
  let severityScore = Math.round(score * 30);

  if (score > 0.6 || state.threatLevel === "critical") {
    classification = "attack";
    isAnomaly = true;
    attackType = trafficSimulator.getAttackType();
    severityScore = Math.min(100, Math.round(50 + score * 50));
  } else if (score > 0.3 || state.threatLevel === "elevated" || state.threatLevel === "high") {
    classification = "suspicious";
    isAnomaly = true;
    severityScore = Math.min(70, Math.round(30 + score * 40));
  }

  return {
    isAnomaly,
    classification,
    confidence: Math.min(0.99, 0.7 + score * 0.3),
    attackType,
    severityScore,
  };
}
