"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyReset = exports.sendOtp = void 0;
const otp_model_1 = __importDefault(require("../models/otp.model"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const mail_service_1 = __importDefault(require("../services/mail.service"));
const http_status_codes_1 = require("http-status-codes");
const user_model_1 = __importDefault(require("../models/user.model"));
const sendOtp = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                success: false,
                message: "Email is required.",
            });
        }
        const user = await user_model_1.default.findOne({ email });
        if (!user) {
            return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json({
                success: false,
                message: "Please enter registered email.",
            });
        }
        const otpGenerate = Math.floor(100000 + Math.random() * 900000);
        const hashOtp = await bcrypt_1.default.hash(otpGenerate.toString(), 10);
        const otpRecord = await otp_model_1.default.create({
            user: user._id,
            otp: hashOtp,
            expiresAt: new Date(Date.now() + 10 * 60 * 1000),
            used: false,
        });
        await (0, mail_service_1.default)(email, "BookSansar - OTP Verification", `Your OTP is: ${otpGenerate}`, `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border:1px solid #e0e0e0; border-radius:10px; overflow:hidden;">
          <div style="background-color:#28a745; color:white; text-align:center; padding:20px;">
            <h1>BookSansar</h1>
          </div>
          <div style="padding:30px; text-align:center;">
            <h2>Email Verification</h2>
            <p>Your One-Time Password (OTP) is:</p>
            <div style="display:inline-block; border:2px dashed #28a745; border-radius:10px; padding:15px 30px; margin:20px 0;">
              <span style="font-size:32px; font-weight:bold; color:#28a745;">${otpGenerate}</span>
            </div>
            <p>This OTP is valid for <strong>10 minutes</strong>. Do not share it with anyone.</p>
          </div>
          <div style="background-color:#f5f5f5; text-align:center; padding:15px; font-size:12px; color:#888;">
            &copy; 2025 BookSansar
          </div>
        </div>
      `);
        console.log(`OTP sent to ${email}: ${otpGenerate}`);
        res.status(http_status_codes_1.StatusCodes.OK).json({
            success: true,
            message: "OTP sent successfully",
            otpRequestId: otpRecord._id,
            userId: user._id,
        });
    }
    catch (error) {
        console.error("Error sending OTP:", error);
        if (error instanceof Error) {
            res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message,
            });
        }
        else {
            res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: "Failed to send OTP",
            });
        }
    }
};
exports.sendOtp = sendOtp;
const verifyReset = async (req, res) => {
    try {
        const { otpRequestId, otp, newPassword } = req.body;
        if (!otpRequestId || !otp || !newPassword) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                success: false,
                message: "OTP, request ID, and new password are required.",
            });
        }
        const record = await otp_model_1.default.findById(otpRequestId);
        if (!record) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                success: false,
                message: "Invalid OTP request.",
            });
        }
        if (record.used) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                success: false,
                message: "OTP already used.",
            });
        }
        if (record.expiresAt < new Date()) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                success: false,
                message: "OTP has expired.",
            });
        }
        const isMatching = await bcrypt_1.default.compare(otp.toString(), record.otp);
        if (!isMatching) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                success: false,
                message: "Invalid OTP.",
            });
        }
        const user = await user_model_1.default.findById(record.user);
        if (!user) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                success: false,
                message: "User not found.",
            });
        }
        const hashedPassword = await bcrypt_1.default.hash(newPassword, 10);
        user.password = hashedPassword;
        await user.save();
        record.used = true;
        await record.save();
        await otp_model_1.default.updateMany({ user: record.user, _id: { $ne: record._id } }, { used: true });
        res.status(http_status_codes_1.StatusCodes.OK).json({
            success: true,
            message: "Password reset successfully. You can now log in.",
        });
    }
    catch (error) {
        console.error("Error verifying OTP / resetting password:", error);
        if (error instanceof Error) {
            res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message,
            });
        }
        else {
            res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: "Something went wrong while resetting password.",
            });
        }
    }
};
exports.verifyReset = verifyReset;
