import mongoose, { Schema, Document, Model } from "mongoose";

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: "learner" | "vendor" | "admin";
  phoneNumber?: string;

  accountStatus: "active" | "suspended";
}

const userSchema: Schema<IUser> = new Schema(
  {
    name: { type: String, required: true },

    email: { type: String, required: true, unique: true },

    password: { type: String, required: true },

    role: {
      type: String,
      enum: ["learner", "vendor", "admin"],
      default: "learner",
    },

    phoneNumber: {
      type: String,
      unique: true,
      sparse: true,
      required: function (this: IUser) {
        return this.role === "vendor";
      },
    },

    accountStatus: {
      type: String,
      enum: ["active", "suspended"],
      default: "active",
    },
  },
  { timestamps: true }
);

const User: Model<IUser> = mongoose.model<IUser>("User", userSchema);
export default User;
