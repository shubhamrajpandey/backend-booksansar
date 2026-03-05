import { Router } from "express";
import { authenticateToken } from "../../middlewares/auth.middleware";
import {
  getReadingStats,
  logReadingSession,
  startReading,
  updateProgress,
  setMonthlyGoal,
  getActivityHeatmap,
} from "./readingstats.controller";

const router = Router();

// All routes require auth
router.use(authenticateToken);

router.get("/", getReadingStats);
router.get("/activity", getActivityHeatmap);
router.post("/session", logReadingSession);
router.post("/start-book", startReading);
router.patch("/update-progress", updateProgress);
router.patch("/monthly-goal", setMonthlyGoal);

export default router;
