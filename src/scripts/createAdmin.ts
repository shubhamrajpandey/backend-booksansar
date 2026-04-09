import mongoose from "mongoose";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
dotenv.config();

import User from "../modules/user/user.model";

const createAdmin = async () => {
    await mongoose.connect(process.env.MONGO_URI as string);

    const email = "admin@booksansar.com";
    const password = "Admin@1234"; // change this after login

    const existing = await User.findOne({ email });
    if (existing) {
        console.log("Admin already exists:", email);
        process.exit(0);
    }

    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(password, salt);

    await User.create({
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