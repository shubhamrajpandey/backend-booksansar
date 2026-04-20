"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const vendor_dashboard_controller_1 = require("./vendor.dashboard.controller");
const auth_middleware_1 = require("../../middlewares/auth.middleware");
const role_middleware_1 = require("../../middlewares/role.middleware");
const router = (0, express_1.Router)();
// All routes require authentication and vendor role
router.get("/stats", auth_middleware_1.authenticateToken, (0, role_middleware_1.verifyRole)("vendor"), vendor_dashboard_controller_1.getVendorDashboardStats);
router.get("/sales-chart", auth_middleware_1.authenticateToken, (0, role_middleware_1.verifyRole)("vendor"), vendor_dashboard_controller_1.getVendorSalesChart);
router.get("/order-status", auth_middleware_1.authenticateToken, (0, role_middleware_1.verifyRole)("vendor"), vendor_dashboard_controller_1.getVendorOrderStatus);
router.get("/top-books", auth_middleware_1.authenticateToken, (0, role_middleware_1.verifyRole)("vendor"), vendor_dashboard_controller_1.getVendorTopBooks);
router.get("/pdf-performance", auth_middleware_1.authenticateToken, (0, role_middleware_1.verifyRole)("vendor"), vendor_dashboard_controller_1.getVendorPDFPerformance);
exports.default = router;
