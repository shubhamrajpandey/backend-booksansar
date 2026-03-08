"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadFile = void 0;
const cloud_1 = require("../../config/cloud");
const http_status_codes_1 = require("http-status-codes");
const uploadFile = async (req, res) => {
    try {
        if (!req.file) {
            return res
                .status(http_status_codes_1.StatusCodes.BAD_REQUEST)
                .json({ message: "No file uploaded" });
        }
        const result = await (0, cloud_1.uploadBufferToCloudinary)(req.file.buffer, "booksansar_uploads");
        return res.status(http_status_codes_1.StatusCodes.OK).json({
            success: true,
            message: "File uploaded successfully",
            url: result.secure_url,
            public_id: result.public_id,
            resource_type: result.resource_type,
            format: result.format,
            pages: result.pages || null,
            bytes: result.bytes,
        });
    }
    catch (error) {
        if (error instanceof Error) {
            return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message,
            });
        }
        else {
            return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: "Upload failed",
            });
        }
    }
};
exports.uploadFile = uploadFile;
