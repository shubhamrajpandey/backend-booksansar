import mongoose from "mongoose";
import bcrypt from "bcrypt";
import User from "../models/user.model";
import "dotenv/config";

const MONGO_URI = process.env.MONGO_URI!;

async function createAdmin() {
  await mongoose.connect(MONGO_URI);

  const existingAdmin = await User.findOne({ role: "admin" });
  if (existingAdmin) {
    console.log("Admin already exists");
    process.exit(0);
  }

  const hashedPassword = await bcrypt.hash("Admin@123", 10);

  await User.create({
    name: "System Admin",
    email: "admin@booksansar.com",
    password: hashedPassword,
    role: "admin",
  });

  console.log("Admin created successfully");
  process.exit(0);
}

createAdmin().catch(console.error);
