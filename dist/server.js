"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const db_1 = __importDefault(require("./config/db"));
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const otp_routes_1 = __importDefault(require("./routes/otp.routes"));
const app = (0, express_1.default)();
dotenv_1.default.config();
(0, db_1.default)();
const PORT = process.env.PORT || 3000;
app.use(express_1.default.json());
app.use('/api/auth', auth_routes_1.default);
app.use('/api/otp', otp_routes_1.default);
app.listen(PORT, () => console.log(`Server running on port http://localhost:${PORT}`));
