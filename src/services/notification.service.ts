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

import Notification from "../modules/notification/notification.model";
export type NotificationType = "order_placed" | "order_confirmed" | "order_shipped" | "order_delivered" | "order_cancelled" | "new_order" | "book_approved" | "book_rejected" | "book_pending" | "chat_message" | "swap_requested" | "swap_accepted" | "swap_rejected";
import logger from "../utils/logger";

// Import the getter lazily to avoid circular-import issues at module load time.
// getIO() returns the Socket.io Server instance initialised in server.ts
let _getIO: (() => import("socket.io").Server) | null = null;

export function registerIOGetter(fn: () => import("socket.io").Server) {
  _getIO = fn;
}

export function getIO() {
  return _getIO ? _getIO() : null;
}

// ─── Core helper ─────────────────────────────────────────────────────────────

interface CreateNotificationParams {
  recipient: string | import("mongoose").Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  metadata?: Record<string, any>;
}

export async function createNotification(
  params: CreateNotificationParams,
): Promise<void> {
  try {
    const notification = await Notification.create({
      userId: params.recipient,
      type: params.type,
      title: params.title,
      body: params.message,
      data: { ...params.metadata, link: params.link },
      isRead: false,
    });

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
          message: notification.body,
          link: notification.data?.link,
          isRead: false,
          createdAt: (notification as any).createdAt,
          metadata: notification.data,
        });
      } catch (socketErr) {
        // Socket errors must never crash the main request
        logger.warn("Socket emit failed:");
      }
    }
  } catch (err) {
    // Notification failures must never crash the main request either
    logger.error("createNotification failed:");
  }
}

// ─── Convenience wrappers (optional but keeps call-sites readable) ────────────

export async function notifyOrderPlaced(
  customerId: string,
  orderId: string,
  orderRef: string,
) {
  await createNotification({
    recipient: customerId,
    type: "order_placed",
    title: "Order Placed",
    message: `Your order ${orderRef} has been placed successfully.`,
    link: "/account?tab=orders",
    metadata: { orderId },
  });
}

export async function notifyOrderStatusChanged(
  customerId: string,
  orderId: string,
  orderRef: string,
  status: string,
) {
  const map: Record<string, { title: string; message: string }> = {
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
  if (!info) return;

  const typeMap: Record<string, NotificationType> = {
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

export async function notifyVendorNewOrder(
  vendorUserId: string,
  orderId: string,
  orderRef: string,
  bookTitle: string,
) {
  await createNotification({
    recipient: vendorUserId,
    type: "new_order",
    title: "New Order Received",
    message: `Someone ordered your book "${bookTitle}" (${orderRef}).`,
    link: "/vendor/orders",
    metadata: { orderId },
  });
}

export async function notifyBookDecision(
  uploaderId: string,
  bookId: string,
  bookTitle: string,
  approved: boolean,
) {
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

export async function notifyAdminBookPending(
  adminUserId: string,
  bookId: string,
  bookTitle: string,
  uploaderName: string,
) {
  await createNotification({
    recipient: adminUserId,
    type: "book_pending",
    title: "New Book Pending Approval",
    message: `"${bookTitle}" by ${uploaderName} needs review.`,
    link: "/admin/books",
    metadata: { bookId },
  });
}

export async function notifyChatMessage(
  recipientId: string,
  senderName: string,
  preview: string,
  conversationId: string,
) {
  await createNotification({
    recipient: recipientId,
    type: "chat_message",
    title: `New message from ${senderName}`,
    message: preview.length > 80 ? preview.slice(0, 80) + "…" : preview,
    link: `/chat?conversation=${conversationId}`,
    metadata: { conversationId },
  });
}
