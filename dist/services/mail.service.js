"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const nodemailer_1 = __importDefault(require("nodemailer"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const transport = nodemailer_1.default.createTransport({
    service: "gmail",
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS,
    }
});
const sendEmail = async (to, subject, text, html) => {
    try {
        const info = await transport.sendMail({
            from: `"BookSansar" <${process.env.GMAIL_USER}>`,
            to,
            subject,
            text,
            html: html || `<p>${text}</p>`
        });
        console.log("Email sent successfully:", info.messageId);
        return info;
    }
    catch (error) {
        console.error("Failed to send email:", error);
        throw new Error("Email sending failed");
    }
};
exports.default = sendEmail;
