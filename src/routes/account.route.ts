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
import { verifyRole } from "../middlewares/role.middleware";

const router = express.Router();

router.use(authenticateToken);


router.route("/profile").get(getProfile).put(updateProfile);


router.get("/stats", verifyRole("learner"), getReadingStats);
router.post("/stats/streak", verifyRole("learner"), updateStreak);


router.get("/orders", verifyRole("learner"), getOrders);

router.route("/preferences").get(getPreferences).put(updatePreferences);


router.delete("/", verifyRole("learner"), deleteAccount);

export default router;