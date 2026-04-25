import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import Notification from "./notification.model";
import User from "../user/user.model";

// GET /api/v1/notifications — get all notifications for current user
export const getMyNotifications = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find({ userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Notification.countDocuments({ userId }),
      Notification.countDocuments({ userId, isRead: false }),
    ]);

    return res.status(StatusCodes.OK).json({
      success: true,
      data: notifications,
      unreadCount,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (err: any) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: err.message,
    });
  }
};

// PATCH /api/v1/notifications/:id/read — mark one as read
export const markOneRead = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    await Notification.findOneAndUpdate(
      { _id: req.params.id, userId },
      { isRead: true },
    );
    return res.status(StatusCodes.OK).json({ success: true });
  } catch (err: any) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: err.message,
    });
  }
};

// PATCH /api/v1/notifications/read-all — mark all as read
export const markAllRead = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    await Notification.updateMany({ userId, isRead: false }, { isRead: true });
    return res.status(StatusCodes.OK).json({ success: true });
  } catch (err: any) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: err.message,
    });
  }
};

// DELETE /api/v1/notifications/:id — delete one
export const deleteOne = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    await Notification.findOneAndDelete({ _id: req.params.id, userId });
    return res.status(StatusCodes.OK).json({ success: true });
  } catch (err: any) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: err.message,
    });
  }
};

// DELETE /api/v1/notifications — clear all
export const clearAll = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    await Notification.deleteMany({ userId });
    return res.status(StatusCodes.OK).json({ success: true });
  } catch (err: any) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: err.message,
    });
  }
};

// POST /api/v1/notifications/fcm-token — save FCM token for push notifications
export const saveFcmToken = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { fcmToken } = req.body;

    if (!fcmToken) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "fcmToken is required",
      });
    }

    await User.findByIdAndUpdate(userId, { fcmToken });

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "FCM token saved",
    });
  } catch (err: any) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: err.message,
    });
  }
};