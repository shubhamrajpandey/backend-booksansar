import mongoose, { Schema, Document, Model } from "mongoose";

export interface INotification extends Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  body: string;
  type:
  | "order_placed"
  | "order_status"
  | "chat_message"
  | "book_approved"
  | "book_rejected"
  | "book_pending"
  | "payout_processed"
  | "rider_assigned"
  | "rider_application"
  | "low_stock"
  | "new_order"
  | "order_confirmed"
  | "order_shipped"
  | "order_delivered"
  | "order_cancelled"
  | "swap_requested"
  | "swap_accepted"
  | "swap_rejected";
  data?: Record<string, string>; // extra payload for deep linking
  isRead: boolean;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true },
    body: { type: String, required: true },
    type: {
      type: String,
      enum: [
        "order_placed", "order_status", "chat_message",
        "book_approved", "book_rejected", "book_pending",
        "payout_processed", "rider_assigned", "rider_application",
        "low_stock", "new_order", "order_confirmed", 
        "order_shipped", "order_delivered", "order_cancelled",
        "swap_requested", "swap_accepted", "swap_rejected"
      ],
      required: true,
    },
    data: { type: Schema.Types.Mixed, default: {} },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true },
);

NotificationSchema.index({ userId: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, isRead: 1 });

const Notification: Model<INotification> =
  mongoose.models.Notification ||
  mongoose.model<INotification>("Notification", NotificationSchema);

export default Notification;