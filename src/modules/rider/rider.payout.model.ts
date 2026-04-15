import mongoose, { Schema, Document } from "mongoose";

export type RiderPayoutStatus = "pending" | "processing" | "paid" | "rejected";

export interface IRiderPayout extends Document {
    payoutId: string;
    riderId: mongoose.Types.ObjectId;     // User._id with role "rider"
    amount: number;                        // amount paid to rider
    esewaId?: string;                      // rider's eSewa ID (from application)
    status: RiderPayoutStatus;
    note?: string;                         // admin note
    processedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const RiderPayoutSchema = new Schema<IRiderPayout>(
    {
        payoutId: { type: String, required: true, unique: true },
        riderId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        amount: { type: Number, required: true },
        esewaId: { type: String },
        status: {
            type: String,
            enum: ["pending", "processing", "paid", "rejected"],
            default: "paid", // admin manually pays then records it
        },
        note: { type: String },
        processedAt: { type: Date },
    },
    { timestamps: true },
);

RiderPayoutSchema.index({ riderId: 1, createdAt: -1 });
RiderPayoutSchema.index({ status: 1 });

export const RiderPayout = mongoose.model<IRiderPayout>(
    "RiderPayout",
    RiderPayoutSchema,
);