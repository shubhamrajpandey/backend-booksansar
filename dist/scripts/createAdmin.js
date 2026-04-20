"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const user_model_1 = __importDefault(require("../modules/user/user.model"));
const createAdmin = async () => {
    await mongoose_1.default.connect(process.env.MONGO_URI);
    const email = "admin@booksansar.com";
    const password = "Admin@1234"; // change this after login
    const existing = await user_model_1.default.findOne({ email });
    if (existing) {
        console.log("Admin already exists:", email);
        process.exit(0);
    }
    const salt = await bcrypt_1.default.genSalt(10);
    const hashed = await bcrypt_1.default.hash(password, salt);
    await user_model_1.default.create({
        name: "Admin",
        email,
        password: hashed,
        role: "admin",
        accountStatus: "active",
        isVerified: true,
        isFirstLogin: false,
    });
    console.log("✅ Admin created successfully!");
    console.log("Email:", email);
    console.log("Password:", password);
    console.log("⚠️  Change this password after first login!");
    process.exit(0);
};
createAdmin().catch((err) => {
    console.error(err);
    process.exit(1);
});
