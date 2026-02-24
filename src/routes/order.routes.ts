import { Router } from "express";
import {
  getMyOrders,
  getOrderById,
  getAllOrdersAdmin,
  getVendorOrders,
  updateOrderStatus,
  getOrderStats,
  getVendorEarnings,
} from "../controllers/order.controller";
import { authenticateToken } from "../middlewares/auth.middleware";
import { verifyRole } from "../middlewares/role.middleware";

const router = Router();

router.get("/my", authenticateToken, getMyOrders);

router.get(
  "/vendor/mine",
  authenticateToken,
  verifyRole("vendor"),
  getVendorOrders,
);

router.get(
  "/admin/stats",
  authenticateToken,
  verifyRole("admin"),
  getOrderStats,
);
router.get(
  "/admin/all",
  authenticateToken,
  verifyRole("admin"),
  getAllOrdersAdmin,
);
router.get(
  "/admin/vendor-earnings",
  authenticateToken,
  verifyRole("admin"),
  getVendorEarnings,
);

router.get("/:orderId", authenticateToken, getOrderById);
router.patch(
  "/:orderId/status",
  authenticateToken,
  verifyRole("vendor", "admin"),
  updateOrderStatus,
);

export default router;
