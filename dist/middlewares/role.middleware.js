"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyRole = void 0;
const http_status_codes_1 = require("http-status-codes");
const verifyRole = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(http_status_codes_1.StatusCodes.UNAUTHORIZED).json({
                success: false,
                message: "Unauthorized. User not authenticated.",
            });
        }
        if (!roles.includes(req.user.role)) {
            return res.status(http_status_codes_1.StatusCodes.FORBIDDEN).json({
                success: false,
                message: "Access denied. You do not have permission for this action.",
            });
        }
        next();
    };
};
exports.verifyRole = verifyRole;
