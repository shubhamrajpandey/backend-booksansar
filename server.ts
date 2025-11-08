import express from "express";
import dotenv from "dotenv";
import connectDb from "./src/config/db";
import  authRoute from "./src/routes/auth.routes";
import otpRoute from "./src/routes/otp.routes";
const app = express();

dotenv.config();

connectDb();

const PORT = process.env.PORT || 3000;

app.use(express.json())

app.use('/api/auth',authRoute);
app.use('/api/otp',otpRoute);


app.listen(PORT, () =>
  console.log(`Server running on port http://localhost:${PORT}`)
);
