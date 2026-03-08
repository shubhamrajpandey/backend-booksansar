"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyReset = exports.sendOtp = void 0;
const otp_model_1 = __importDefault(require("./otp.model"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const mail_service_1 = __importDefault(require("../../services/mail.service"));
const http_status_codes_1 = require("http-status-codes");
const user_model_1 = __importDefault(require("../user/user.model"));
const logger_1 = __importDefault(require("../../utils/logger"));
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
      <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: auto; border:1px solid #e5e7eb; border-radius:12px; overflow:hidden; box-shadow:0 4px 12px rgba(0,0,0,0.08);">
        
        <!-- Header -->
        <div style="background-color:#321874; color:#ffffff; text-align:center; padding:24px 0;">
          <h1 style="margin:0; font-size:28px; font-family:'Sedgwick Ave', cursive; letter-spacing:1px;">
            <span style="color:#ffffff;">Book</span><span style="color:#E68A00;">Sansar</span>
          </h1>
          <p style="margin:6px 0 0; font-size:14px; color:#e0e0e0;">Your digital reading companion</p>
        </div>
    
        <!-- Body -->
        <div style="padding:32px 24px; text-align:center; color:#1f2937;">
          <h2 style="margin-bottom:12px; color:#321874;">Email Verification</h2>
          <p style="margin:0 0 24px; font-size:15px; line-height:1.6; color:#4b5563;">
            Please use the following One-Time Password (OTP) to verify your email:
          </p>
    
          <!-- OTP Box -->
          <div style="display:inline-block; background:#fdfaf6; border:2px solid #E68A00; border-radius:10px; padding:16px 40px; margin:20px 0;">
            <span style="font-size:36px; font-weight:700; color:#E68A00; letter-spacing:4px;">${otpGenerate}</span>
          </div>
    
          <p style="margin:16px 0 0; font-size:14px; color:#6b7280;">
            This OTP is valid for <strong style="color:#E68A00;">10 minutes</strong>. Please do not share it with anyone.
          </p>
        </div>
    
        <!-- Footer -->
        <div style="background-color:#f9fafb; text-align:center; padding:16px; font-size:13px; color:#9ca3af;">
          &copy; 2025 <span style="color:#321874; font-weight:600;">BookSansar</span>. All rights reserved.
        </div>
      </div>
    
      <!-- Google Font -->
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Sedgwick+Ave&display=swap" rel="stylesheet">
      `);
        logger_1.default.info(`OTP sent to ${email}: ${otpGenerate}`);
        res.status(http_status_codes_1.StatusCodes.OK).json({
            success: true,
            message: "OTP sent successfully",
            otpRequestId: otpRecord._id,
            userId: user._id,
        });
    }
    catch (error) {
        logger_1.default.error("Error sending OTP");
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
            message: "Password reset successfully.",
        });
    }
    catch (error) {
        logger_1.default.error("Error verifying OTP / resetting password");
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
