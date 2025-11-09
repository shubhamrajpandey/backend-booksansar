"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const otp_controller_1 = require("../controllers/otp.controller");
const router = (0, express_1.Router)();
router.post("/send-otp", otp_controller_1.sendOtp);
router.post("/verify-reset", otp_controller_1.verifyReset);
exports.default = router;
