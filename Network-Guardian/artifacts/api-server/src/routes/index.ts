import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import trafficRouter from "./traffic";
import alertsRouter from "./alerts";
import blocklistRouter from "./blocklist";
import incidentsRouter from "./incidents";
import statsRouter from "./stats";
import scannerRouter from "./scanner";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/traffic", trafficRouter);
router.use("/alerts", alertsRouter);
router.use("/blocklist", blocklistRouter);
router.use("/incidents", incidentsRouter);
router.use("/stats", statsRouter);
router.use("/scan", scannerRouter);

export default router;
