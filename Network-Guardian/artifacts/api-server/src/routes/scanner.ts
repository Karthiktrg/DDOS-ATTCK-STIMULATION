import { Router, type IRouter, type Request, type Response } from "express";
import { requireAuth } from "./auth";
import { analyzeUrl, startManualSimulation, stopManualSimulation, getManualSimulationStatus } from "../lib/manual-simulator";

const router: IRouter = Router();

router.post("/analyze", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { url } = req.body;

  if (!url || typeof url !== "string") {
    res.status(400).json({ error: "A valid URL is required" });
    return;
  }

  const trimmed = url.trim();
  if (trimmed.length < 3) {
    res.status(400).json({ error: "URL too short" });
    return;
  }

  try {
    const result = await analyzeUrl(trimmed);
    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Scan error");
    res.status(500).json({ error: "Scan failed" });
  }
});

router.post("/simulate-ddos", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { targetUrl, attackType, durationSeconds } = req.body;

  if (!targetUrl || !attackType || !durationSeconds) {
    res.status(400).json({ error: "targetUrl, attackType, and durationSeconds are required" });
    return;
  }

  const validTypes = ["syn_flood", "udp_flood", "http_flood", "icmp_flood", "slowloris", "dns_amplification"];
  if (!validTypes.includes(attackType)) {
    res.status(400).json({ error: `Invalid attack type. Must be one of: ${validTypes.join(", ")}` });
    return;
  }

  const duration = parseInt(durationSeconds);
  if (isNaN(duration) || duration < 10 || duration > 120) {
    res.status(400).json({ error: "durationSeconds must be between 10 and 120" });
    return;
  }

  try {
    const sim = await startManualSimulation(targetUrl, attackType, duration);
    res.json({
      isActive: true,
      targetUrl: sim.targetUrl,
      targetDomain: sim.targetDomain,
      attackType: sim.attackType,
      durationSeconds: sim.durationSeconds,
      elapsedSeconds: 0,
      remainingSeconds: sim.durationSeconds,
      currentPps: 0,
      peakPps: 0,
      packetsGenerated: 0,
      threatLevel: "critical",
      startedAt: sim.startedAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Simulation start error");
    res.status(500).json({ error: "Failed to start simulation" });
  }
});

router.get("/simulation-status", requireAuth, (_req: Request, res: Response): void => {
  res.json(getManualSimulationStatus());
});

router.post("/stop-simulation", requireAuth, (_req: Request, res: Response): void => {
  stopManualSimulation();
  res.json({ message: "Simulation stopped" });
});

export default router;
