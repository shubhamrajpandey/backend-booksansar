"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const logger_1 = __importDefault(require("../utils/logger"));
const MONGO_URI = process.env.MONGO_URI || "";
if (!MONGO_URI) {
    logger_1.default.error("MONGO_URI is not found in the .env file.");
    process.exit(1);
}
const connectDb = async () => {
    try {
        // Setting up Google DNS as a fallback because Node.js is resolving DNS to 127.0.0.1 locally which throws ECONNREFUSED
        require("dns").setServers(["8.8.8.8", "8.8.4.4"]);
        mongoose_1.default.connect(MONGO_URI);
        logger_1.default.info("BookSansar Database successfully connnected.");
    }
    catch (error) {
        logger_1.default.error("MongoDB Connection Failed");
        process.exit(1);
    }
};
exports.default = connectDb;
