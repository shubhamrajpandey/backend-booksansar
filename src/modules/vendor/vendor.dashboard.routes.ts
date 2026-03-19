import { Router } from "express";
import {
  getVendorDashboardStats,
  getVendorSalesChart,
  getVendorOrderStatus,
  getVendorTopBooks,
  getVendorPDFPerformance,
} from "./vendor.dashboard.controller";
import { authenticateToken } from "../../middlewares/auth.middleware";
import { verifyRole } from "../../middlewares/role.middleware";

const router = Router();

// All routes require authentication and vendor role
router.get(
  "/stats",
  authenticateToken,
  verifyRole("vendor"),
  getVendorDashboardStats,
);
router.get(
  "/sales-chart",
  authenticateToken,
  verifyRole("vendor"),
  getVendorSalesChart,
);
router.get(
  "/order-status",
  authenticateToken,
  verifyRole("vendor"),
  getVendorOrderStatus,
);
router.get(
  "/top-books",
  authenticateToken,
  verifyRole("vendor"),
  getVendorTopBooks,
);
router.get(
  "/pdf-performance",
  authenticateToken,
  verifyRole("vendor"),
  getVendorPDFPerformance,
);

export default router;
