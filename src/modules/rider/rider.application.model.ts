import mongoose, { Schema, Document, Model } from "mongoose";

export interface IRiderApplication extends Document {
  // Personal Info
  fullName: string;
  email: string;
  phone: string;
  age: number;
  address: string;
  district: string;
  esewaId: string;

  // Vehicle & Experience
  vehicleType: "motorcycle" | "scooter" | "bicycle" | "electric_bike";
  licenseNumber: string;
  experience: "none" | "less_1" | "1_2" | "2_plus";
  availability: "Full Time" | "Part Time" | "Weekdays Only" | "Weekends Only";
  message?: string;

  // Document
  licenseUrl: string; // Cloudinary URL of driving license photo

  // Application Status
  status: "pending" | "approved" | "rejected";
  rejectionReason?: string;

  // Set when approved — rider's User._id
  riderId?: mongoose.Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

const RiderApplicationSchema = new Schema<IRiderApplication>(
  {
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, required: true },
    age: { type: Number, required: true, min: 18, max: 60 },
    address: { type: String, required: true },
    district: { type: String, required: true },
    esewaId: { type: String, required: true },

    vehicleType: {
      type: String,
      enum: ["motorcycle", "scooter", "bicycle", "electric_bike"],
      required: true,
    },
    licenseNumber: { type: String, required: true },
    experience: {
      type: String,
      enum: ["none", "less_1", "1_2", "2_plus"],
      required: true,
    },
    availability: {
      type: String,
      enum: ["Full Time", "Part Time", "Weekdays Only", "Weekends Only"],
      required: true,
    },
    message: { type: String, default: "" },

    licenseUrl: { type: String, required: true },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    rejectionReason: { type: String, default: "" },
    riderId: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true },
);

RiderApplicationSchema.index({ email: 1 });
RiderApplicationSchema.index({ status: 1, createdAt: -1 });

const RiderApplication: Model<IRiderApplication> =
  mongoose.model<IRiderApplication>("RiderApplication", RiderApplicationSchema);

export default RiderApplication;
