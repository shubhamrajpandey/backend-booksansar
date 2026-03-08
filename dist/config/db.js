"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const logger_1 = __importDefault(require("../utils/logger"));
dotenv_1.default.config();
const MONGO_URI = process.env.MONGO_URI || "";
if (!MONGO_URI) {
    logger_1.default.error("MONGO_URI is not found in the .env file.");
    process.exit(1);
}
const connectDb = async () => {
    try {
        mongoose_1.default.connect(MONGO_URI);
        logger_1.default.info("BookSansar Database successfully connnected.");
    }
    catch (error) {
        logger_1.default.error("MongoDB Connection Failed");
        process.exit(1);
    }
};
exports.default = connectDb;
