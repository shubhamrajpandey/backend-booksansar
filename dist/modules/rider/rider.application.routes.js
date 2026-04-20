"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const rider_application_controller_1 = require("./rider.application.controller");
const rider_controller_1 = require("./rider.controller");
const auth_middleware_1 = require("../../middlewares/auth.middleware");
const role_middleware_1 = require("../../middlewares/role.middleware");
const router = (0, express_1.Router)();
// ── Public ───────────────────────────────────────────────────
router.post("/apply", rider_application_controller_1.applyAsRider);
// ── Rider operational routes ─────────────────────────────────
router.get("/orders", auth_middleware_1.authenticateToken, (0, role_middleware_1.verifyRole)("rider"), rider_controller_1.getRiderOrders);
router.patch("/orders/:id/status", auth_middleware_1.authenticateToken, (0, role_middleware_1.verifyRole)("rider"), rider_controller_1.updateOrderStatus);
router.get("/active-delivery", auth_middleware_1.authenticateToken, (0, role_middleware_1.verifyRole)("rider"), rider_controller_1.getActiveDelivery);
router.post("/location", auth_middleware_1.authenticateToken, (0, role_middleware_1.verifyRole)("rider"), rider_controller_1.updateRiderLocation);
router.get("/history", auth_middleware_1.authenticateToken, (0, role_middleware_1.verifyRole)("rider"), rider_controller_1.getRiderHistory);
router.get("/stats", auth_middleware_1.authenticateToken, (0, role_middleware_1.verifyRole)("rider"), rider_controller_1.getRiderStats);
router.post("/payout-request", auth_middleware_1.authenticateToken, (0, role_middleware_1.verifyRole)("rider"), rider_controller_1.requestPayout);
router.get("/profile", auth_middleware_1.authenticateToken, (0, role_middleware_1.verifyRole)("rider"), rider_controller_1.getRiderProfile);
// ── Admin routes ─────────────────────────────────────────────
router.get("/admin/earnings", auth_middleware_1.authenticateToken, (0, role_middleware_1.verifyRole)("admin"), rider_controller_1.getRiderEarningsAdmin);
router.post("/admin/pay", auth_middleware_1.authenticateToken, (0, role_middleware_1.verifyRole)("admin"), rider_controller_1.payRider);
router.get("/applications", auth_middleware_1.authenticateToken, (0, role_middleware_1.verifyRole)("admin"), rider_application_controller_1.getAllApplications);
router.get("/applications/:id", auth_middleware_1.authenticateToken, (0, role_middleware_1.verifyRole)("admin"), rider_application_controller_1.getApplicationById);
router.patch("/applications/:id/approve", auth_middleware_1.authenticateToken, (0, role_middleware_1.verifyRole)("admin"), rider_application_controller_1.approveApplication);
router.patch("/applications/:id/reject", auth_middleware_1.authenticateToken, (0, role_middleware_1.verifyRole)("admin"), rider_application_controller_1.rejectApplication);
exports.default = router;
