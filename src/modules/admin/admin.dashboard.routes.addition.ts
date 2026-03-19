// Add these routes to your existing admin.routes.ts file

import {
  getAdminDashboardStats,
  getAdminRevenueChart,
  getAdminKYCStatus,
  getAdminOrderStatus,
} from "./admin.dashboard.controller";
import { authenticateToken } from "../../middlewares/auth.middleware";
import { verifyRole } from "../../middlewares/role.middleware";
import { Router } from "express";
const router = Router();

// Add these routes in your admin router:

router.get(
  "/dashboard/stats",
  authenticateToken,
  verifyRole("admin"),
  getAdminDashboardStats,
);
router.get(
  "/dashboard/revenue-chart",
  authenticateToken,
  verifyRole("admin"),
  getAdminRevenueChart,
);
router.get(
  "/dashboard/kyc-status",
  authenticateToken,
  verifyRole("admin"),
  getAdminKYCStatus,
);
router.get(
  "/dashboard/order-status",
  authenticateToken,
  verifyRole("admin"),
  getAdminOrderStatus,
);

export default router;
