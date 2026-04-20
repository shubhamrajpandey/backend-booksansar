"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const order_controller_1 = require("./order.controller");
const auth_middleware_1 = require("../../middlewares/auth.middleware");
const role_middleware_1 = require("../../middlewares/role.middleware");
const router = (0, express_1.Router)();
router.get("/shipping-preview", auth_middleware_1.authenticateToken, order_controller_1.getShippingPreview);
router.get("/my", auth_middleware_1.authenticateToken, order_controller_1.getMyOrders);
// ✅ MUST be before /:orderId
router.get("/available-riders", auth_middleware_1.authenticateToken, (0, role_middleware_1.verifyRole)("vendor"), order_controller_1.getAvailableRiders);
router.get("/vendor/mine", auth_middleware_1.authenticateToken, (0, role_middleware_1.verifyRole)("vendor"), order_controller_1.getVendorOrders);
router.get("/admin/stats", auth_middleware_1.authenticateToken, (0, role_middleware_1.verifyRole)("admin"), order_controller_1.getOrderStats);
router.get("/admin/all", auth_middleware_1.authenticateToken, (0, role_middleware_1.verifyRole)("admin"), order_controller_1.getAllOrdersAdmin);
router.get("/admin/vendor-earnings", auth_middleware_1.authenticateToken, (0, role_middleware_1.verifyRole)("admin"), order_controller_1.getVendorEarnings);
// ✅ /:orderId routes AFTER all specific routes
router.get("/:orderId", auth_middleware_1.authenticateToken, order_controller_1.getOrderById);
router.patch("/:orderId/status", auth_middleware_1.authenticateToken, (0, role_middleware_1.verifyRole)("vendor", "admin"), order_controller_1.updateOrderStatus);
router.patch("/:orderId/assign-rider", auth_middleware_1.authenticateToken, (0, role_middleware_1.verifyRole)("vendor"), order_controller_1.assignRiderToOrder);
exports.default = router;
