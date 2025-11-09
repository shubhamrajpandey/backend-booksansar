"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.userLogin = exports.userRegister = void 0;
const user_model_1 = __importDefault(require("../models/user.model"));
const http_status_codes_1 = require("http-status-codes");
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const userRegister = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                success: false,
                message: "Please enter a valid email address.",
            });
        }
        if (!name || !email || !password) {
            res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                success: false,
                message: "All fields are required.",
            });
            return;
        }
        const findUser = await user_model_1.default.findOne({ email });
        if (findUser) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                success: false,
                message: "Email already exists. Please log in instead.",
            });
        }
        const salt = await bcrypt_1.default.genSalt(10);
        const hashPass = await bcrypt_1.default.hash(password, salt);
        const register = await user_model_1.default.create({
            name,
            email,
            password: hashPass,
            role: "learner",
        });
        res.status(http_status_codes_1.StatusCodes.CREATED).json({
            success: true,
            message: "Successfully Created",
            data: register,
        });
    }
    catch (error) {
        if (error instanceof Error) {
            res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message,
            });
        }
        else {
            res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: "An unexpected error occurred",
            });
        }
    }
};
exports.userRegister = userRegister;
const userLogin = async (req, res) => {
    try {
        const { email, password } = req.body;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                success: false,
                message: "Please enter a valid email address.",
            });
        }
        const user = await user_model_1.default.findOne({ email });
        if (!user) {
            return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json({
                success: false,
                message: "User not found. Please login.",
            });
        }
        const isMatching = await bcrypt_1.default.compare(password, user.password);
        if (!isMatching) {
            return res.status(http_status_codes_1.StatusCodes.UNAUTHORIZED).json({
                success: false,
                message: "Invalid credentials. Please try again.",
            });
        }
        const token = jsonwebtoken_1.default.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "12h" });
        res.status(http_status_codes_1.StatusCodes.OK).json({
            success: true,
            message: "Successfully Logged In.",
            token,
        });
    }
    catch (error) {
        if (error instanceof Error) {
            res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message,
            });
        }
        else {
            res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: "An unexpected error occurred",
            });
        }
    }
};
exports.userLogin = userLogin;
