// PATH: backend-booksansar/src/modules/notification/notification.routes.ts

import { Router } from "express";
import { authenticateToken } from "../../middlewares/auth.middleware";
import {
  getNotifications,
  markOneRead,
  markAllRead,
  deleteNotification,
  clearAllNotifications,
} from "./notification.controller";

const router = Router();

// All notification routes require authentication
router.use(authenticateToken);

// GET    /api/v1/notifications          — fetch latest 50
router.get("/", getNotifications);

// PATCH  /api/v1/notifications/read-all — mark all as read
//        ⚠️  Must be ABOVE /:id so "read-all" isn't treated as a param
router.patch("/read-all", markAllRead);

// PATCH  /api/v1/notifications/:id/read — mark one as read
router.patch("/:id/read", markOneRead);

// DELETE /api/v1/notifications          — clear all
router.delete("/", clearAllNotifications);

// DELETE /api/v1/notifications/:id      — delete one
router.delete("/:id", deleteNotification);

export default router;
