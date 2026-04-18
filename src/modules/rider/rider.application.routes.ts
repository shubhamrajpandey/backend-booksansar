import { Router } from "express";
import {
  applyAsRider,
  getAllApplications,
  getApplicationById,
  approveApplication,
  rejectApplication,
} from "./rider.application.controller";
import {
  getRiderOrders,
  updateOrderStatus,
  getActiveDelivery,
  updateRiderLocation,
  getRiderHistory,
  getRiderStats,
  requestPayout,
  getRiderEarningsAdmin,
  payRider,
  getRiderProfile,
} from "./rider.controller";
import { authenticateToken } from "../../middlewares/auth.middleware";
import { verifyRole } from "../../middlewares/role.middleware";

const router = Router();

// ── Public ───────────────────────────────────────────────────
router.post("/apply", applyAsRider);

// ── Rider operational routes ─────────────────────────────────
router.get("/orders", authenticateToken, verifyRole("rider"), getRiderOrders);
router.patch("/orders/:id/status", authenticateToken, verifyRole("rider"), updateOrderStatus);
router.get("/active-delivery", authenticateToken, verifyRole("rider"), getActiveDelivery);
router.post("/location", authenticateToken, verifyRole("rider"), updateRiderLocation);
router.get("/history", authenticateToken, verifyRole("rider"), getRiderHistory);
router.get("/stats", authenticateToken, verifyRole("rider"), getRiderStats);
router.post("/payout-request", authenticateToken, verifyRole("rider"), requestPayout);
router.get("/profile", authenticateToken, verifyRole("rider"), getRiderProfile);

// ── Admin routes ─────────────────────────────────────────────
router.get("/admin/earnings", authenticateToken, verifyRole("admin"), getRiderEarningsAdmin);
router.post("/admin/pay", authenticateToken, verifyRole("admin"), payRider);

router.get("/applications", authenticateToken, verifyRole("admin"), getAllApplications);
router.get("/applications/:id", authenticateToken, verifyRole("admin"), getApplicationById);
router.patch("/applications/:id/approve", authenticateToken, verifyRole("admin"), approveApplication);
router.patch("/applications/:id/reject", authenticateToken, verifyRole("admin"), rejectApplication);

export default router;