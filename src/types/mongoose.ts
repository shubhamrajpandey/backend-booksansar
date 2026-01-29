import mongoose from "mongoose";

export interface IUserRef {
  _id: mongoose.Types.ObjectId;
  email: string;
}
