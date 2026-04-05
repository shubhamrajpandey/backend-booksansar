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
  accountStatus: "active" | "suspended";
  createdAt: Date;
  updatedAt: Date;
}

const userSchema: Schema<IUser> = new Schema(
  {
    name: { type: String, required: true },

    email: { type: String, required: true, unique: true },

    password: { type: String, required: true },

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

    accountStatus: {
      type: String,
      enum: ["active", "suspended"],
      default: "active",
    },
  },
  { timestamps: true },
);

const User: Model<IUser> = mongoose.model<IUser>("User", userSchema);
export default User;
