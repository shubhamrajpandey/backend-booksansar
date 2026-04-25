import admin from "firebase-admin";
import User from "../user/user.model";
import Notification from "./notification.model";
import logger from "../../utils/logger";
import { getIO } from "../../services/notification.service";

// ── Initialize Firebase Admin once ──────────────────────────
if (!admin.apps.length) {
    try {
        const privateKey = process.env.FIREBASE_PRIVATE_KEY;
        if (!privateKey) {
            logger.warn("FIREBASE_PRIVATE_KEY is missing. Push notifications are disabled.");
        } else {
            const formattedKey = privateKey.includes("\\n")
                ? privateKey.replace(/\\n/g, "\n")
                : privateKey;

            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId: process.env.FIREBASE_PROJECT_ID,
                    privateKey: formattedKey,
                    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                }),
            });
            logger.info("Firebase Admin initialized successfully.");
        }
    } catch (error: any) {
        logger.error(`Failed to initialize Firebase Admin: ${error.message}`);
    }
}

export interface SendNotificationPayload {
    userId: string;
    title: string;
    body: string;
    type: INotification["type"];
    data?: Record<string, string>;
}

type INotification = import("./notification.model").INotification;

// ── Main function — saves to DB + sends FCM if token exists ──
export const sendNotification = async (payload: SendNotificationPayload) => {
    const { userId, title, body, type, data = {} } = payload;

    logger.info(`🔔 sendNotification called: userId=${userId}, type=${type}, title=${title}`);

    try {
        // 1. Always save to MongoDB (in-app bell)
        const notification = await Notification.create({
            userId,
            title,
            body,
            type,
            data,
            isRead: false,
        });

        // 2. Send FCM push if user has a device token
        const user = await User.findById(userId).select("fcmToken name").lean();
        if (user?.fcmToken && admin.apps.length > 0) {
            try {
                await admin.messaging().send({
                    token: user.fcmToken,
                    notification: { title, body },
                    data: { type, ...data },
                    android: {
                        priority: "high",
                        notification: {
                            channelId: "booksansar_default",
                            sound: "default",
                        },
                    },
                });
            } catch (fcmErr: any) {
                if (
                    fcmErr.code === "messaging/invalid-registration-token" ||
                    fcmErr.code === "messaging/registration-token-not-registered"
                ) {
                    await User.findByIdAndUpdate(userId, { $unset: { fcmToken: 1 } });
                }
                logger.error(`FCM send error for user ${userId}: ${fcmErr.message}`);
            }
        }

        // 3. Emit Socket.io event for real-time web updates
        try {
            const io = getIO();
            if (io) {
                io.to(String(userId)).emit("new_notification", {
                    _id: notification._id,
                    type: notification.type,
                    title: notification.title,
                    message: notification.body,
                    link: notification.data?.link,
                    isRead: false,
                    createdAt: (notification as any).createdAt,
                    metadata: notification.data,
                    data: notification.data,
                });
            }
        } catch (socketErr: any) {
            logger.warn(`Socket emit failed in FCM service: ${socketErr.message}`);
        }

        return notification;
    } catch (err: any) {
        logger.error(`sendNotification error: ${err.message}`);
    }
};

// ── Convenience helpers for each event ──────────────────────

export const notifyOrderPlaced = async (
    customerId: string,
    vendorId: string,
    orderId: string,
    bookTitle: string,
) => {
    await sendNotification({
        userId: customerId,
        title: "Order Placed! 🎉",
        body: `Your order for "${bookTitle}" has been placed successfully.`,
        type: "order_placed",
        data: { orderId, link: "/account?tab=orders" },
    });
    await sendNotification({
        userId: vendorId,
        title: "New Order Received! 📦",
        body: `You have a new order for "${bookTitle}".`,
        type: "order_placed",
        data: { orderId, link: "/vendor/orders" },
    });
};

export const notifyOrderStatus = async (
    customerId: string,
    orderId: string,
    status: string,
) => {
    const statusMessages: Record<string, string> = {
        confirmed: "Your order has been confirmed! ✅",
        assigned: "A rider has been assigned to your order 🛵",
        picked_up: "Your order has been picked up by the rider 📦",
        in_transit: "Your order is on the way! 🚀",
        shipped: "Your order has been shipped! 🚚",
        delivered: "Your order has been delivered! 🎉",
        cancelled: "Your order has been cancelled.",
        refunded: "Your order has been refunded.",
    };

    const body = statusMessages[status] || `Order status updated to: ${status}`;

    await sendNotification({
        userId: customerId,
        title: "Order Update",
        body,
        type: "order_status",
        data: { orderId, status, link: "/account?tab=orders" },
    });
};

// ── FIXED: only one definition, includes link ────────────────
export const notifyChatMessage = async (
    receiverId: string,
    senderName: string,
    preview: string,
    conversationId: string,
) => {
    await sendNotification({
        userId: receiverId,
        title: `New message from ${senderName} 💬`,
        body: preview.length > 60 ? preview.slice(0, 60) + "..." : preview,
        type: "chat_message",
        data: {
            conversationId,
            link: `/chat?conversation=${conversationId}`,
        },
    });
};

export const notifyBookModerated = async (
    uploaderId: string,
    bookTitle: string,
    approved: boolean,
    bookId: string,
) => {
    await sendNotification({
        userId: uploaderId,
        title: approved ? "Book Approved! ✅" : "Book Rejected ❌",
        body: approved
            ? `"${bookTitle}" is now live on BookSansar.`
            : `"${bookTitle}" was not approved. Contact support for details.`,
        type: approved ? "book_approved" : "book_rejected",
        data: { bookId, link: approved ? `/view/${bookId}` : "/manage-books" },
    });
};

export const notifyPayoutProcessed = async (
    vendorId: string,
    amount: number,
    payoutId: string,
) => {
    await sendNotification({
        userId: vendorId,
        title: "Payout Processed! 💰",
        body: `Rs. ${amount} has been sent to your eSewa account.`,
        type: "payout_processed",
        data: { payoutId, amount: String(amount), link: "/vendor/earnings" },
    });
};

export const notifyRiderAssigned = async (
    riderId: string,
    orderId: string,
    address: string,
) => {
    await sendNotification({
        userId: riderId,
        title: "New Delivery Assigned! 🛵",
        body: `You have a new delivery to: ${address}`,
        type: "rider_assigned",
        data: { orderId },
    });
};

export const notifyRiderApplication = async (
    adminId: string,
    applicantName: string,
    applicationId: string,
) => {
    await sendNotification({
        userId: adminId,
        title: "New Rider Application 📋",
        body: `${applicantName} has applied to become a rider.`,
        type: "rider_application",
        data: { applicationId, link: "/admin/riders" },
    });
};

export const notifyLowStock = async (
    vendorId: string,
    bookTitle: string,
    stock: number,
    bookId: string,
) => {
    await sendNotification({
        userId: vendorId,
        title: "Low Stock Alert ⚠️",
        body: `"${bookTitle}" has only ${stock} units left. Restock soon!`,
        type: "low_stock",
        data: { bookId, stock: String(stock), link: "/vendor/inventory" },
    });
};

export const notifySwapRequested = async (
    ownerId: string,
    proposerName: string,
    bookTitle: string,
    swapId: string,
) => {
    await sendNotification({
        userId: ownerId,
        title: "New Swap Request! 🔄",
        body: `${proposerName} has proposed a swap for your book "${bookTitle}".`,
        type: "swap_requested",
        data: { swapId, link: "/manage-books" },
    });
};

export const notifySwapResponded = async (
    proposerId: string,
    ownerName: string,
    bookTitle: string,
    action: "accept" | "reject",
    swapId: string,
) => {
    const isAccepted = action === "accept";
    await sendNotification({
        userId: proposerId,
        title: isAccepted ? "Swap Accepted! 🎉" : "Swap Rejected ❌",
        body: isAccepted
            ? `${ownerName} accepted your swap proposal for "${bookTitle}".`
            : `${ownerName} rejected your swap proposal for "${bookTitle}".`,
        type: isAccepted ? "swap_accepted" : "swap_rejected",
        data: { swapId, link: `/swap/${swapId}` },
    });
};