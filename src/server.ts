import express from "express";
import dotenv from "dotenv";
dotenv.config();
import connectDb from "./config/db";
import authRoute from "./routes/auth.routes";
import otpRoute from "./routes/otp.routes";
import chatRoute from "./routes/chat.routes";
import cors from "cors";
import uploadRoute from "./routes/upload.routes";
import bookRoute from "./routes/books.routes";
import http from "http";
import { initSocket } from "./services/socket.service";
import adminRoute from "./routes/admin.routes";

const app = express();

const server = http.createServer(app);
initSocket(server);

app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(express.json());

connectDb();

const PORT = process.env.PORT || 5000;

app.use("/api/auth", authRoute);
app.use("/api/otp", otpRoute);
app.use("/api/upload", uploadRoute);
app.use("/api/books", bookRoute);
app.use("/api/chat", chatRoute);
app.use("/api/admin", adminRoute);


server.listen(PORT, () =>
  console.log(`Server running on port http://localhost:${PORT}`),
);
