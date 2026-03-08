"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const http_1 = __importDefault(require("http"));
const db_1 = __importDefault(require("./config/db"));
const socket_service_1 = require("./services/socket.service");
const app_1 = __importDefault(require("./app"));
const logger_1 = __importDefault(require("./utils/logger"));
(0, db_1.default)();
const PORT = process.env.PORT || 5000;
const server = http_1.default.createServer(app_1.default);
(0, socket_service_1.initSocket)(server);
server.listen(PORT, () => logger_1.default.info(`Server running on port http://localhost:${PORT}`));
