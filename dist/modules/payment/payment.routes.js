"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const payment_controller_1 = require("./payment.controller");
const auth_middleware_1 = require("../../middlewares/auth.middleware");
const router = (0, express_1.Router)();
router.post("/esewa/initiate", auth_middleware_1.authenticateToken, payment_controller_1.initiateEsewaPayment);
router.get("/esewa/verify", payment_controller_1.verifyEsewaPaymentCallback);
exports.default = router;
