//------- server.js-------

import express from "express";
import dotenv from "dotenv";
import connectDb from "./src/config/db";
const app = express();

dotenv.config();

connectDb();

const PORT = process.env.PORT || 3000;

app.use(express.json())

app.listen(PORT, () =>
  console.log(`Server running on port http://localhost:${PORT}`)
);
