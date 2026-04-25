import mongoose, { Schema, Document, Model } from "mongoose";

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: "learner" | "vendor" | "admin" | "rider";
  phoneNumber?: string;
  location?: string;
  bio?: string;
  avatar?: string;
  googleId?: string;
  accountStatus: "active" | "suspended";
  isFirstLogin: boolean;
  isVerified: boolean;
  fcmToken?: string;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema: Schema<IUser> = new Schema(
  {
    name: { type: String, required: true },

    email: { type: String, required: true, unique: true },

    password: { type: String, required: false, default: "" },

    role: {
      type: String,
      enum: ["learner", "vendor", "admin", "rider"],
      default: "learner",
    },

    phoneNumber: {
      type: String,
      unique: true,
      sparse: true,
      required: function (this: IUser) {
        return this.role === "vendor" || this.role === "rider";
      },
    },

    location: {
      type: String,
      default: "",
    },

    bio: {
      type: String,
      maxlength: 500,
      default: "",
    },

    avatar: {
      type: String,
      default: "",
    },

    googleId: {
      type: String,
      default: "",
    },

    accountStatus: {
      type: String,
      enum: ["active", "suspended"],
      default: "active",
    },
    isFirstLogin: {
      type: Boolean,
      default: false,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    fcmToken: {
      type: String,
      default: "",
    },
  },
  { timestamps: true },
);

const User: Model<IUser> = mongoose.model<IUser>("User", userSchema);
export default User;
