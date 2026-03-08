// PATH: backend-booksansar/src/modules/notification/notification.controller.ts

import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import Notification from "./notification.model";
import logger from "../../utils/logger";

// GET /api/v1/notifications
// Returns the latest 50 notifications for the logged-in user
export const getNotifications = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    const notifications = await Notification.find({ recipient: userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    const unreadCount = notifications.filter((n) => !n.isRead).length;

    return res.status(StatusCodes.OK).json({
      success: true,
      unreadCount,
      notifications,
    });
  } catch (err) {
    logger.error("getNotifications error:");
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: "Failed to fetch notifications" });
  }
};

// PATCH /api/v1/notifications/:id/read
// Marks a single notification as read
export const markOneRead = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: userId },
      { isRead: true },
      { new: true },
    );

    if (!notification) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ success: false, message: "Notification not found" });
    }

    return res.status(StatusCodes.OK).json({ success: true, notification });
  } catch (err) {
    logger.error("markOneRead error:");
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: "Failed to mark notification as read" });
  }
};

// PATCH /api/v1/notifications/read-all
// Marks ALL unread notifications for the user as read
export const markAllRead = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    await Notification.updateMany(
      { recipient: userId, isRead: false },
      { isRead: true },
    );

    return res
      .status(StatusCodes.OK)
      .json({ success: true, message: "All notifications marked as read" });
  } catch (err) {
    logger.error("markAllRead error:");
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: "Failed to mark all as read" });
  }
};

// DELETE /api/v1/notifications/:id
// Deletes a single notification (user can clear individual ones)
export const deleteNotification = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      recipient: userId,
    });

    if (!notification) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ success: false, message: "Notification not found" });
    }

    return res
      .status(StatusCodes.OK)
      .json({ success: true, message: "Notification deleted" });
  } catch (err) {
    logger.error("deleteNotification error:");
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: "Failed to delete notification" });
  }
};

// DELETE /api/v1/notifications
// Clears ALL notifications for the user
export const clearAllNotifications = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    await Notification.deleteMany({ recipient: userId });

    return res
      .status(StatusCodes.OK)
      .json({ success: true, message: "All notifications cleared" });
  } catch (err) {
    logger.error("clearAllNotifications error:");
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: "Failed to clear notifications" });
  }
};
