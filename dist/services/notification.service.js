"use strict";
// PATH: backend-booksansar/src/modules/notification/notification.service.ts
//
// Usage (from any controller):
//   import { createNotification } from "../notification/notification.service";
//   await createNotification({
//     recipient: userId,
//     type: "order_placed",
//     title: "Order Confirmed",
//     message: "Your order #BS-1023 has been placed.",
//     link: "/account?tab=orders",
//     metadata: { orderId: order._id },
//   });
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerIOGetter = registerIOGetter;
exports.createNotification = createNotification;
exports.notifyOrderPlaced = notifyOrderPlaced;
exports.notifyOrderStatusChanged = notifyOrderStatusChanged;
exports.notifyVendorNewOrder = notifyVendorNewOrder;
exports.notifyBookDecision = notifyBookDecision;
exports.notifyAdminBookPending = notifyAdminBookPending;
exports.notifyChatMessage = notifyChatMessage;
const notification_model_1 = __importDefault(require("../modules/notification/notification.model"));
const logger_1 = __importDefault(require("../utils/logger"));
// Import the getter lazily to avoid circular-import issues at module load time.
// getIO() returns the Socket.io Server instance initialised in server.ts
let _getIO = null;
function registerIOGetter(fn) {
    _getIO = fn;
}
async function createNotification(params) {
    try {
        const notification = await notification_model_1.default.create(params);
        // ── Real-time push via Socket.io ──────────────────────────────────────
        // Each authenticated user joins a private room named after their userId.
        // The frontend listens for "new_notification" on that socket connection.
        if (_getIO) {
            try {
                const io = _getIO();
                io.to(String(params.recipient)).emit("new_notification", {
                    _id: notification._id,
                    type: notification.type,
                    title: notification.title,
                    message: notification.message,
                    link: notification.link,
                    isRead: false,
                    createdAt: notification.createdAt,
                    metadata: notification.metadata,
                });
            }
            catch (socketErr) {
                // Socket errors must never crash the main request
                logger_1.default.warn("Socket emit failed:");
            }
        }
    }
    catch (err) {
        // Notification failures must never crash the main request either
        logger_1.default.error("createNotification failed:");
    }
}
// ─── Convenience wrappers (optional but keeps call-sites readable) ────────────
async function notifyOrderPlaced(customerId, orderId, orderRef) {
    await createNotification({
        recipient: customerId,
        type: "order_placed",
        title: "Order Placed",
        message: `Your order ${orderRef} has been placed successfully.`,
        link: "/account?tab=orders",
        metadata: { orderId },
    });
}
async function notifyOrderStatusChanged(customerId, orderId, orderRef, status) {
    const map = {
        confirmed: {
            title: "Order Confirmed",
            message: `Order ${orderRef} has been confirmed.`,
        },
        shipped: {
            title: "Order Shipped",
            message: `Order ${orderRef} is on its way!`,
        },
        delivered: {
            title: "Order Delivered",
            message: `Order ${orderRef} has been delivered. Enjoy!`,
        },
        cancelled: {
            title: "Order Cancelled",
            message: `Order ${orderRef} has been cancelled.`,
        },
        payment_received: {
            title: "Payment Received",
            message: `Payment for order ${orderRef} was received.`,
        },
    };
    const info = map[status];
    if (!info)
        return;
    const typeMap = {
        confirmed: "order_confirmed",
        shipped: "order_shipped",
        delivered: "order_delivered",
        cancelled: "order_cancelled",
        payment_received: "order_placed",
    };
    await createNotification({
        recipient: customerId,
        type: typeMap[status] || "order_confirmed",
        title: info.title,
        message: info.message,
        link: "/account?tab=orders",
        metadata: { orderId },
    });
}
async function notifyVendorNewOrder(vendorUserId, orderId, orderRef, bookTitle) {
    await createNotification({
        recipient: vendorUserId,
        type: "new_order",
        title: "New Order Received",
        message: `Someone ordered your book "${bookTitle}" (${orderRef}).`,
        link: "/vendor/orders",
        metadata: { orderId },
    });
}
async function notifyBookDecision(uploaderId, bookId, bookTitle, approved) {
    await createNotification({
        recipient: uploaderId,
        type: approved ? "book_approved" : "book_rejected",
        title: approved ? "Book Approved" : "Book Rejected",
        message: approved
            ? `Your book "${bookTitle}" has been approved and is now live.`
            : `Your book "${bookTitle}" was not approved. Please review and resubmit.`,
        link: approved ? `/view/${bookId}` : undefined,
        metadata: { bookId },
    });
}
async function notifyAdminBookPending(adminUserId, bookId, bookTitle, uploaderName) {
    await createNotification({
        recipient: adminUserId,
        type: "book_pending",
        title: "New Book Pending Approval",
        message: `"${bookTitle}" by ${uploaderName} needs review.`,
        link: "/admin/books",
        metadata: { bookId },
    });
}
async function notifyChatMessage(recipientId, senderName, preview, conversationId) {
    await createNotification({
        recipient: recipientId,
        type: "chat_message",
        title: `New message from ${senderName}`,
        message: preview.length > 80 ? preview.slice(0, 80) + "…" : preview,
        link: `/chat?conversation=${conversationId}`,
        metadata: { conversationId },
    });
}
