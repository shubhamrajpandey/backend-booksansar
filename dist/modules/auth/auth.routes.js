"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = require("./auth.controller");
const router = (0, express_1.Router)();
router.post("/register", auth_controller_1.userRegister);
router.post("/login", auth_controller_1.userLogin);
router.post("/vendor-register", auth_controller_1.vendorRegistration);
exports.default = router;
