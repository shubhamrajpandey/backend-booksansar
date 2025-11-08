import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IOTP extends Document {
  user: Types.ObjectId;
  otp: string;
  expiresAt: Date;
  used: boolean;
  createdAt: Date;
}

const OTPSchema: Schema<IOTP> = new Schema({
  user: {type: mongoose.Schema.Types.ObjectId, ref:"User", required: true},
  otp: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  used: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

OTPSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const OTP: Model<IOTP> = mongoose.model<IOTP>("OTP", OTPSchema);

export default OTP;
