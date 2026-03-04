import mongoose, { Schema, Document } from "mongoose";

export type SupportType =
  | "feedback"
  | "book_request"
  | "contact"
  | "return_request";
export type SupportStatus = "pending" | "in_review" | "resolved" | "rejected";

export interface ISupport extends Document {
  type: SupportType;
  status: SupportStatus;
  name?: string;
  email: string;
  phone?: string;
  subject?: string;
  message: string;
  rating?: number;
  files?: string[];
  orderNumber?: string;
  returnReason?: string;
  bookTitle?: string;
  bookAuthor?: string;
  adminNote?: string;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const supportSchema = new Schema<ISupport>(
  {
    type: {
      type: String,
      enum: ["feedback", "book_request", "contact", "return_request"],
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "in_review", "resolved", "rejected"],
      default: "pending",
    },
    name: String,
    email: { type: String, required: true },
    phone: String,
    subject: String,
    message: { type: String, required: true },
    rating: { type: Number, min: 1, max: 5 },
    files: [String],
    orderNumber: String,
    returnReason: String,
    bookTitle: String,
    bookAuthor: String,
    adminNote: String,
    resolvedAt: Date,
  },
  { timestamps: true },
);

export default mongoose.model<ISupport>("Support", supportSchema);
