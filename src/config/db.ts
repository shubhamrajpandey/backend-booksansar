import mongoose from "mongoose";

import logger from "../utils/logger";

const MONGO_URI: string = process.env.MONGO_URI || "";

if (!MONGO_URI) {
  logger.error("MONGO_URI is not found in the .env file.");
  process.exit(1);
}

const connectDb = async () => {
  try {
    // Setting up Google DNS as a fallback because Node.js is resolving DNS to 127.0.0.1 locally which throws ECONNREFUSED
    require("dns").setServers(["8.8.8.8", "8.8.4.4"]);
    mongoose.connect(MONGO_URI);
    logger.info("BookSansar Database successfully connnected.");
  } catch (error) {
    logger.error("MongoDB Connection Failed");
    process.exit(1);
  }
};

export default connectDb;
