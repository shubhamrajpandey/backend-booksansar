import mongoose, { Schema, Document } from "mongoose";

export type PayoutStatus = "pending" | "processing" | "paid" | "rejected";

export interface IPayout extends Document {
  payoutId: string;
  vendorId: mongoose.Types.ObjectId;
  requestedAmount: number;
  commissionDeducted: number;
  netAmount: number;
  esewaId: string;
  status: PayoutStatus;
  note?: string;
  adminNote?: string;
  processedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PayoutSchema = new Schema<IPayout>(
  {
    payoutId: { type: String, required: true, unique: true },
    vendorId: { type: Schema.Types.ObjectId, ref: "Vendor", required: true },
    requestedAmount: { type: Number, required: true },
    commissionDeducted: { type: Number, required: true },
    netAmount: { type: Number, required: true },
    esewaId: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "processing", "paid", "rejected"],
      default: "pending",
    },
    note: { type: String },
    adminNote: { type: String },
    processedAt: { type: Date },
  },
  { timestamps: true },
);

PayoutSchema.index({ vendorId: 1, createdAt: -1 });
PayoutSchema.index({ status: 1 });

export const Payout = mongoose.model<IPayout>("Payout", PayoutSchema);
