import { Router } from "express";
import {
  getMyOrders,
  getOrderById,
  getAllOrdersAdmin,
  getVendorOrders,
  updateOrderStatus,
  getOrderStats,
} from "../controllers/order.controller";
import { authenticateToken } from "../middlewares/auth.middleware";
import { verifyRole } from "../middlewares/role.middleware";

const router = Router();

router.get("/my", authenticateToken, getMyOrders);
router.get("/:orderId", authenticateToken, getOrderById);

router.get(
  "/vendor/mine",
  authenticateToken,
  verifyRole("vendor"),
  getVendorOrders,
);
router.patch(
  "/:orderId/status",
  authenticateToken,
  verifyRole("vendor", "admin"),
  updateOrderStatus,
);

router.get(
  "/admin/all",
  authenticateToken,
  verifyRole("admin"),
  getAllOrdersAdmin,
);
router.get(
  "/admin/stats",
  authenticateToken,
  verifyRole("admin"),
  getOrderStats,
);

export default router;
