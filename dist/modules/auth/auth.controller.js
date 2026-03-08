"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.vendorRegistration = exports.userLogin = exports.userRegister = void 0;
const user_model_1 = __importDefault(require("../user/user.model"));
const http_status_codes_1 = require("http-status-codes");
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const vendor_model_1 = __importDefault(require("../vendor/vendor.model"));
//user registration
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
            message: "User Successfully Created",
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
//user login
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
        if (user.role === "vendor") {
            const vendorProfile = await vendor_model_1.default.findOne({ userId: user._id });
            if (!vendorProfile) {
                return res.status(http_status_codes_1.StatusCodes.FORBIDDEN).json({
                    success: false,
                    message: "Vendor profile not found.",
                });
            }
            if (vendorProfile.status !== "approved") {
                return res.status(http_status_codes_1.StatusCodes.FORBIDDEN).json({
                    success: false,
                    message: "Vendor profile not approved yet.",
                });
            }
        }
        const token = jsonwebtoken_1.default.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "12h" });
        const safeUser = {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
        };
        res.status(http_status_codes_1.StatusCodes.OK).json({
            success: true,
            message: "Successfully Logged In.",
            token,
            user: safeUser,
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
//Vendor Registration
const vendorRegistration = async (req, res) => {
    try {
        const { name, email, password, phoneNumber, storeName, businessType, address, province, district, businessCertUrl, governmentIdUrl, panVatNumber, storeLogoUrl, esewaId, } = req.body;
        const existingUser = await user_model_1.default.findOne({ email });
        if (!email ||
            !password ||
            !name ||
            !phoneNumber ||
            !storeName ||
            !businessType ||
            !address ||
            !province ||
            !district ||
            !businessCertUrl ||
            !governmentIdUrl ||
            !panVatNumber ||
            !esewaId) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                success: false,
                message: "All required fields must be provided for vendor registration",
            });
        }
        if (existingUser) {
            if (existingUser.role === "vendor") {
                return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                    success: false,
                    message: "Vendor profile already exists for this email",
                });
            }
            else {
                return res.status(http_status_codes_1.StatusCodes.CONFLICT).json({
                    success: false,
                    message: "An account with this email already exists",
                });
            }
        }
        if (!password) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                success: false,
                message: "Password is required for new vendor",
            });
        }
        const genSalt = await bcrypt_1.default.genSalt(10);
        const hashPassword = await bcrypt_1.default.hash(password, genSalt);
        const newUser = await user_model_1.default.create({
            name,
            email,
            password: hashPassword,
            phoneNumber,
            role: "vendor",
        });
        const vendor = await vendor_model_1.default.create({
            userId: newUser?._id,
            storeName,
            businessType,
            address,
            province,
            district,
            businessCertUrl,
            governmentIdUrl,
            panVatNumber,
            storeLogoUrl,
            esewaId,
            paymentType: "escrow",
        });
        return res.status(http_status_codes_1.StatusCodes.OK).json({
            success: true,
            message: "Vendor Successfully Created",
            newUser,
            vendor,
        });
    }
    catch (error) {
        console.error("Vendor registration error:", error);
        if (error instanceof Error) {
            return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message,
            });
        }
        else {
            return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: "An unexpected error occurred",
            });
        }
    }
};
exports.vendorRegistration = vendorRegistration;
