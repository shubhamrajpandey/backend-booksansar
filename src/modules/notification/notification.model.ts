// PATH: backend-booksansar/src/modules/notification/notification.model.ts

import mongoose, { Document, Schema } from "mongoose";

export type NotificationType =
  // Learner / User
  | "order_placed"
  | "order_confirmed"
  | "order_shipped"
  | "order_delivered"
  | "order_cancelled"
  | "chat_message"
  | "streak_reminder"
  | "book_approved" // learner who uploaded free / second-hand book
  | "book_rejected"
  // Vendor
  | "new_order" // vendor gets this when a customer buys their book
  | "stock_low"
  // Admin
  | "book_pending" // new book submitted for admin review
  | "vendor_pending"; // new vendor registration awaiting approval

export interface INotification extends Document {
  recipient: mongoose.Types.ObjectId; // User._id
  type: NotificationType;
  title: string;
  message: string;
  link?: string; // client-side route to navigate on click
  isRead: boolean;
  metadata?: Record<string, any>; // { orderId, bookId, senderId, … }
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    recipient: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        "order_placed",
        "order_confirmed",
        "order_shipped",
        "order_delivered",
        "order_cancelled",
        "chat_message",
        "streak_reminder",
        "book_approved",
        "book_rejected",
        "new_order",
        "stock_low",
        "book_pending",
        "vendor_pending",
      ],
      required: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    link: { type: String },
    isRead: { type: Boolean, default: false },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true },
);

// Keep only the latest 100 notifications per user (TTL-style cleanup on read)
NotificationSchema.index({ recipient: 1, createdAt: -1 });

export default mongoose.model<INotification>(
  "Notification",
  NotificationSchema,
);
