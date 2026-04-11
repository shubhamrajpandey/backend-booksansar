import { Router } from "express";
import {
  getMyOrders,
  getOrderById,
  getAllOrdersAdmin,
  getVendorOrders,
  updateOrderStatus,
  getOrderStats,
  getVendorEarnings,
  getShippingPreview,
  assignRiderToOrder,
  getAvailableRiders,
} from "./order.controller";
import { authenticateToken } from "../../middlewares/auth.middleware";
import { verifyRole } from "../../middlewares/role.middleware";

const router = Router();

router.get("/shipping-preview", authenticateToken, getShippingPreview);
router.get("/my", authenticateToken, getMyOrders);

// ✅ MUST be before /:orderId
router.get("/available-riders", authenticateToken, verifyRole("vendor"), getAvailableRiders);

router.get("/vendor/mine", authenticateToken, verifyRole("vendor"), getVendorOrders);
router.get("/admin/stats", authenticateToken, verifyRole("admin"), getOrderStats);
router.get("/admin/all", authenticateToken, verifyRole("admin"), getAllOrdersAdmin);
router.get("/admin/vendor-earnings", authenticateToken, verifyRole("admin"), getVendorEarnings);

// ✅ /:orderId routes AFTER all specific routes
router.get("/:orderId", authenticateToken, getOrderById);
router.patch("/:orderId/status", authenticateToken, verifyRole("vendor", "admin"), updateOrderStatus);
router.patch("/:orderId/assign-rider", authenticateToken, verifyRole("vendor"), assignRiderToOrder);

export default router;