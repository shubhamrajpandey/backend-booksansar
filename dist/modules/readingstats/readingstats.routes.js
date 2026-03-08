"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../../middlewares/auth.middleware");
const readingstats_controller_1 = require("./readingstats.controller");
const router = (0, express_1.Router)();
// All routes require auth
router.use(auth_middleware_1.authenticateToken);
router.get("/", readingstats_controller_1.getReadingStats);
router.get("/activity", readingstats_controller_1.getActivityHeatmap);
router.post("/session", readingstats_controller_1.logReadingSession);
router.post("/start-book", readingstats_controller_1.startReading);
router.patch("/update-progress", readingstats_controller_1.updateProgress);
router.patch("/monthly-goal", readingstats_controller_1.setMonthlyGoal);
exports.default = router;
