import { Router } from "express";
import {
  requestPayout,
  getMyPayouts,
  getAllPayouts,
  updatePayoutStatus,
  getPayoutStats,
} from "../controllers/payout.controller";
import { authenticateToken } from "../middlewares/auth.middleware";
import { verifyRole } from "../middlewares/role.middleware";

const router = Router();

router.post("/request", authenticateToken, verifyRole("vendor"), requestPayout);
router.get("/my", authenticateToken, verifyRole("vendor"), getMyPayouts);

router.get(
  "/admin/stats",
  authenticateToken,
  verifyRole("admin"),
  getPayoutStats,
);
router.get("/admin/all", authenticateToken, verifyRole("admin"), getAllPayouts);
router.patch(
  "/admin/:payoutId/status",
  authenticateToken,
  verifyRole("admin"),
  updatePayoutStatus,
);

export default router;
