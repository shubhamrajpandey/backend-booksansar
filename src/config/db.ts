import mongoose from "mongoose";

import logger from "../utils/logger";

const MONGO_URI: string = process.env.MONGO_URI || "";

if (!MONGO_URI) {
  logger.error("MONGO_URI is not found in the .env file.");
  process.exit(1);
}

const connectDb = async () => {
  try {
    mongoose.connect(MONGO_URI);
    logger.info("BookSansar Database successfully connnected.");
  } catch (error) {
    logger.error("MongoDB Connection Failed");
    process.exit(1);
  }
};

export default connectDb;
