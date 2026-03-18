"use strict";
// PATH: backend-booksansar/src/modules/notification/notification.routes.ts
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../../middlewares/auth.middleware");
const notification_controller_1 = require("./notification.controller");
const router = (0, express_1.Router)();
// All notification routes require authentication
router.use(auth_middleware_1.authenticateToken);
// GET    /api/v1/notifications          — fetch latest 50
router.get("/", notification_controller_1.getNotifications);
// PATCH  /api/v1/notifications/read-all — mark all as read
//        ⚠️  Must be ABOVE /:id so "read-all" isn't treated as a param
router.patch("/read-all", notification_controller_1.markAllRead);
// PATCH  /api/v1/notifications/:id/read — mark one as read
router.patch("/:id/read", notification_controller_1.markOneRead);
// DELETE /api/v1/notifications          — clear all
router.delete("/", notification_controller_1.clearAllNotifications);
// DELETE /api/v1/notifications/:id      — delete one
router.delete("/:id", notification_controller_1.deleteNotification);
exports.default = router;
