import express from "express";
import dotenv from "dotenv";
import connectDb from "./config/db";
import authRoute from "./routes/auth.routes";
import otpRoute from "./routes/otp.routes";
import cors from "cors"

const app = express();

app.use(cors({
  origin:"http://localhost:3000",
  credentials:true
}))

dotenv.config();

connectDb();

const PORT = process.env.PORT || 3000;

app.use(express.json())

app.use('/api/auth',authRoute);
app.use('/api/otp',otpRoute);


app.listen(PORT, () =>
  console.log(`Server running on port http://localhost:${PORT}`)
);
