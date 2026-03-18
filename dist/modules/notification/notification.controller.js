"use strict";
// PATH: backend-booksansar/src/modules/notification/notification.controller.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearAllNotifications = exports.deleteNotification = exports.markAllRead = exports.markOneRead = exports.getNotifications = void 0;
const http_status_codes_1 = require("http-status-codes");
const notification_model_1 = __importDefault(require("./notification.model"));
const logger_1 = __importDefault(require("../../utils/logger"));
// GET /api/v1/notifications
// Returns the latest 50 notifications for the logged-in user
const getNotifications = async (req, res) => {
    try {
        const userId = req.user.id;
        const notifications = await notification_model_1.default.find({ recipient: userId })
            .sort({ createdAt: -1 })
            .limit(50)
            .lean();
        const unreadCount = notifications.filter((n) => !n.isRead).length;
        return res.status(http_status_codes_1.StatusCodes.OK).json({
            success: true,
            unreadCount,
            notifications,
        });
    }
    catch (err) {
        logger_1.default.error("getNotifications error:");
        return res
            .status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR)
            .json({ success: false, message: "Failed to fetch notifications" });
    }
};
exports.getNotifications = getNotifications;
// PATCH /api/v1/notifications/:id/read
// Marks a single notification as read
const markOneRead = async (req, res) => {
    try {
        const userId = req.user.id;
        const notification = await notification_model_1.default.findOneAndUpdate({ _id: req.params.id, recipient: userId }, { isRead: true }, { new: true });
        if (!notification) {
            return res
                .status(http_status_codes_1.StatusCodes.NOT_FOUND)
                .json({ success: false, message: "Notification not found" });
        }
        return res.status(http_status_codes_1.StatusCodes.OK).json({ success: true, notification });
    }
    catch (err) {
        logger_1.default.error("markOneRead error:");
        return res
            .status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR)
            .json({ success: false, message: "Failed to mark notification as read" });
    }
};
exports.markOneRead = markOneRead;
// PATCH /api/v1/notifications/read-all
// Marks ALL unread notifications for the user as read
const markAllRead = async (req, res) => {
    try {
        const userId = req.user.id;
        await notification_model_1.default.updateMany({ recipient: userId, isRead: false }, { isRead: true });
        return res
            .status(http_status_codes_1.StatusCodes.OK)
            .json({ success: true, message: "All notifications marked as read" });
    }
    catch (err) {
        logger_1.default.error("markAllRead error:");
        return res
            .status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR)
            .json({ success: false, message: "Failed to mark all as read" });
    }
};
exports.markAllRead = markAllRead;
// DELETE /api/v1/notifications/:id
// Deletes a single notification (user can clear individual ones)
const deleteNotification = async (req, res) => {
    try {
        const userId = req.user.id;
        const notification = await notification_model_1.default.findOneAndDelete({
            _id: req.params.id,
            recipient: userId,
        });
        if (!notification) {
            return res
                .status(http_status_codes_1.StatusCodes.NOT_FOUND)
                .json({ success: false, message: "Notification not found" });
        }
        return res
            .status(http_status_codes_1.StatusCodes.OK)
            .json({ success: true, message: "Notification deleted" });
    }
    catch (err) {
        logger_1.default.error("deleteNotification error:");
        return res
            .status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR)
            .json({ success: false, message: "Failed to delete notification" });
    }
};
exports.deleteNotification = deleteNotification;
// DELETE /api/v1/notifications
// Clears ALL notifications for the user
const clearAllNotifications = async (req, res) => {
    try {
        const userId = req.user.id;
        await notification_model_1.default.deleteMany({ recipient: userId });
        return res
            .status(http_status_codes_1.StatusCodes.OK)
            .json({ success: true, message: "All notifications cleared" });
    }
    catch (err) {
        logger_1.default.error("clearAllNotifications error:");
        return res
            .status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR)
            .json({ success: false, message: "Failed to clear notifications" });
    }
};
exports.clearAllNotifications = clearAllNotifications;
