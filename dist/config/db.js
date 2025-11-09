"use strict";
//-----Database Connection------
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const MONGO_URI = process.env.MONGO_URI || "";
if (!MONGO_URI) {
    console.error("MONGO_URI is not found in the .env file.");
    process.exit(1);
}
const connectDb = async () => {
    try {
        mongoose_1.default.connect(MONGO_URI);
        console.log("BookSansar Database successfully connnected.");
    }
    catch (error) {
        console.error("MongoDB Connection Failed:", error);
        process.exit(1);
    }
};
exports.default = connectDb;
