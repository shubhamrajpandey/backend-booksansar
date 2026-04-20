"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ai_controller_1 = require("./ai.controller");
const auth_middleware_1 = require("../../middlewares/auth.middleware");
const router = (0, express_1.Router)();
const optionalAuth = (req, res, next) => {
    const authHeader = req.headers["authorization"];
    if (authHeader) {
        return (0, auth_middleware_1.authenticateToken)(req, res, next);
    }
    next();
};
router.get("/recommendations", auth_middleware_1.authenticateToken, ai_controller_1.getRecommendations);
router.get("/trending", ai_controller_1.getTrending);
router.post("/chat", optionalAuth, ai_controller_1.aiChat);
router.get("/search", ai_controller_1.smartSearch);
exports.default = router;
