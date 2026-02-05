import express from "express";
import {
  getProfile,
  updateProfile,
  getReadingStats,
  updateStreak,
  getOrders,
  getPreferences,
  updatePreferences,
  deleteAccount,
} from "../controllers/account.controller";
import { authenticateToken } from "../middlewares/auth.middleware";

const router = express.Router();


router.use(authenticateToken);


router.route("/profile").get(getProfile).put(updateProfile);


router.get("/stats", getReadingStats);
router.post("/stats/streak", updateStreak);


router.get("/orders", getOrders);


router.route("/preferences").get(getPreferences).put(updatePreferences);


router.delete("/", deleteAccount);

export default router;