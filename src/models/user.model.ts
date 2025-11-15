//-----User Model----- 
import mongoose, { Schema, Document, Model } from "mongoose";

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: "learner" | "vendor" | "admin";
}

const userSchema: Schema<IUser> = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ["leraner", "vendor", "admin"],
      default: "learner",
    },
  },
  {
    timestamps: true, 
  }
);

const User: Model<IUser> = mongoose.model<IUser>("User", userSchema);

export default User;
