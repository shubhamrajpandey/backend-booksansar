"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const user_model_1 = __importDefault(require("../modules/user/user.model"));
require("dotenv/config");
const MONGO_URI = process.env.MONGO_URI;
async function createAdmin() {
    await mongoose_1.default.connect(MONGO_URI);
    const existingAdmin = await user_model_1.default.findOne({ role: "admin" });
    if (existingAdmin) {
        console.log("Admin already exists");
        process.exit(0);
    }
    const hashedPassword = await bcrypt_1.default.hash("Admin@123", 10);
    await user_model_1.default.create({
        name: "System Admin",
        email: "admin@booksansar.com",
        password: hashedPassword,
        role: "admin",
    });
    console.log("Admin created successfully");
    process.exit(0);
}
createAdmin().catch(console.error);
