import mongoose, { Schema, Document, Model } from "mongoose";

export interface IVendor extends Document {
  userId: mongoose.Types.ObjectId;
  storeName: string;
  businessType: string;
  address: string;
  province: string;
  district: string;

  businessCertUrl: string;
  governmentIdUrl: string;
  panVatNumber: string;
  storeLogoUrl?: string;

  esewaId: string;
  paymentType: "escrow";

  status: "pending" | "approved" | "rejected";
}

const vendorSchema: Schema = new Schema<IVendor>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },

    storeName: { type: String, required: true },
    businessType: { type: String, required: true },
    address: { type: String, required: true },
    province: { type: String, required: true },
    district: { type: String, required: true },

    businessCertUrl: { type: String, required: true },
    governmentIdUrl: { type: String, required: true },
    panVatNumber: { type: String, required: true },
    storeLogoUrl: { type: String },

    esewaId: { type: String, required: true },
    paymentType: {
      type: String,
      required: true,
      enum: ["escrow"],
      default: "escrow",
    },

    status: {
      type: String,
      default: "pending",
      enum: ["pending", "approved", "rejected"],
    },
  },
  { timestamps: true }
);

const Vendor: Model<IVendor> = mongoose.model<IVendor>("Vendor", vendorSchema);
export default Vendor;