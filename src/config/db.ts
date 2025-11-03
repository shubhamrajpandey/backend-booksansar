//-----Database Connection------

import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();
const MONGO_URI: string = process.env.MONGO_URI || "";

if (!MONGO_URI) {
  console.error("MONGO_URI is not found in the .env file.");
  process.exit(1);
}

const connectDb = async () => {
  try {
    mongoose.connect(MONGO_URI);
    console.log("BookSansar Database successfully connnected.");
  } catch (error) {
    console.error("MongoDB Connection Failed:", error);
    process.exit(1);
  }
};

export default connectDb;