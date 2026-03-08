"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyRole = void 0;
const http_status_codes_1 = require("http-status-codes");
const logger_1 = __importDefault(require("../utils/logger"));
const verifyRole = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            logger_1.default.error("Unauthorized. User not authenticated.");
            return res.status(http_status_codes_1.StatusCodes.UNAUTHORIZED).json({
                success: false,
                message: "Unauthorized. User not authenticated.",
            });
        }
        if (!roles.includes(req.user.role)) {
            logger_1.default.error("Access denied. You do not have permission for this action.");
            return res.status(http_status_codes_1.StatusCodes.FORBIDDEN).json({
                success: false,
                message: "Access denied. You do not have permission for this action.",
            });
        }
        next();
    };
};
exports.verifyRole = verifyRole;
