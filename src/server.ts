import express from "express";
import dotenv from "dotenv";
dotenv.config();             
import connectDb from "./config/db";
import authRoute from "./routes/auth.routes";
import otpRoute from "./routes/otp.routes";
import cors from "cors";
import uploadRoute from "./routes/upload.routes";

const app = express();

app.use(cors({
  origin: "http://localhost:3000",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

app.use(express.json());

connectDb();

const PORT = process.env.PORT || 5000;

app.use('/api/auth', authRoute);
app.use('/api/otp', otpRoute);
app.use('/api',uploadRoute);

app.listen(PORT, () =>
  console.log(`Server running on port http://localhost:${PORT}`)
);
