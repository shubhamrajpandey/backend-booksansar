import dotenv from "dotenv";

dotenv.config();

import http from "http";
import connectDb from "./config/db";
import { initSocket } from "./services/socket.service";
import app from "./app";
import logger from "./utils/logger";

connectDb();

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);
initSocket(server);

server.listen(PORT, () =>
  logger.info(`Server running on port http://localhost:${PORT}`),
);
