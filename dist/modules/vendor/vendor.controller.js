"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getVendorBilling = exports.updateVendorPassword = exports.updateVendorProfile = exports.getVendorProfile = void 0;
const http_status_codes_1 = require("http-status-codes");
const user_model_1 = __importDefault(require("../user/user.model"));
const vendor_model_1 = __importDefault(require("../vendor/vendor.model"));
const payout_model_1 = require("../payout/payout.model");
const bcrypt_1 = __importDefault(require("bcrypt"));
// GET /vendor/settings/profile
const getVendorProfile = async (req, res) => {
    try {
        const userId = req.user?.id;
        const user = await user_model_1.default.findById(userId).select("-password");
        if (!user) {
            return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json({
                success: false,
                message: "User not found",
            });
        }
        const vendor = await vendor_model_1.default.findOne({ userId });
        if (!vendor) {
            return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json({
                success: false,
                message: "Vendor profile not found",
            });
        }
        return res.status(http_status_codes_1.StatusCodes.OK).json({
            success: true,
            message: "Profile fetched successfully",
            data: {
                // user fields
                name: user.name,
                email: user.email,
                phoneNumber: user.phoneNumber || "",
                avatar: user.avatar || "",
                // vendor fields
                storeName: vendor.storeName,
                businessType: vendor.businessType,
                address: vendor.address,
                province: vendor.province,
                district: vendor.district,
                storeLogoUrl: vendor.storeLogoUrl || "",
                esewaId: vendor.esewaId,
                status: vendor.status,
                panVatNumber: vendor.panVatNumber,
            },
        });
    }
    catch (error) {
        console.error("Get vendor profile error:", error);
        return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: "Server error",
        });
    }
};
exports.getVendorProfile = getVendorProfile;
// PATCH /vendor/settings/profile
const updateVendorProfile = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { name, email, phoneNumber, storeName, address, province, district, storeLogoUrl, esewaId, } = req.body;
        const user = await user_model_1.default.findById(userId);
        if (!user) {
            return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json({
                success: false,
                message: "User not found",
            });
        }
        const vendor = await vendor_model_1.default.findOne({ userId });
        if (!vendor) {
            return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json({
                success: false,
                message: "Vendor profile not found",
            });
        }
        // Update user fields
        if (name)
            user.name = name;
        if (phoneNumber !== undefined)
            user.phoneNumber = phoneNumber;
        if (email && email !== user.email) {
            const existing = await user_model_1.default.findOne({ email });
            if (existing) {
                return res.status(http_status_codes_1.StatusCodes.CONFLICT).json({
                    success: false,
                    message: "Email already in use",
                });
            }
            user.email = email;
        }
        await user.save();
        // Update vendor fields
        if (storeName)
            vendor.storeName = storeName;
        if (address)
            vendor.address = address;
        if (province)
            vendor.province = province;
        if (district)
            vendor.district = district;
        if (storeLogoUrl !== undefined)
            vendor.storeLogoUrl = storeLogoUrl;
        if (esewaId)
            vendor.esewaId = esewaId;
        await vendor.save();
        return res.status(http_status_codes_1.StatusCodes.OK).json({
            success: true,
            message: "Profile updated successfully",
            data: {
                name: user.name,
                email: user.email,
                phoneNumber: user.phoneNumber || "",
                storeName: vendor.storeName,
                address: vendor.address,
                province: vendor.province,
                district: vendor.district,
                storeLogoUrl: vendor.storeLogoUrl || "",
                esewaId: vendor.esewaId,
            },
        });
    }
    catch (error) {
        console.error("Update vendor profile error:", error);
        return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: "Server error",
        });
    }
};
exports.updateVendorProfile = updateVendorProfile;
// PATCH /vendor/settings/password
const updateVendorPassword = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                success: false,
                message: "Current password and new password are required",
            });
        }
        if (newPassword.length < 6) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                success: false,
                message: "New password must be at least 6 characters",
            });
        }
        const user = await user_model_1.default.findById(userId);
        if (!user) {
            return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json({
                success: false,
                message: "User not found",
            });
        }
        const isValid = await bcrypt_1.default.compare(currentPassword, user.password);
        if (!isValid) {
            return res.status(http_status_codes_1.StatusCodes.UNAUTHORIZED).json({
                success: false,
                message: "Current password is incorrect",
            });
        }
        user.password = await bcrypt_1.default.hash(newPassword, 10);
        await user.save();
        return res.status(http_status_codes_1.StatusCodes.OK).json({
            success: true,
            message: "Password updated successfully",
        });
    }
    catch (error) {
        console.error("Update vendor password error:", error);
        return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: "Server error",
        });
    }
};
exports.updateVendorPassword = updateVendorPassword;
// GET /vendor/settings/billing
const getVendorBilling = async (req, res) => {
    try {
        const userId = req.user?.id;
        const vendor = await vendor_model_1.default.findOne({ userId });
        if (!vendor) {
            return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json({
                success: false,
                message: "Vendor not found",
            });
        }
        // Last 5 payouts as billing history
        const payouts = await payout_model_1.Payout.find({ vendorId: vendor._id })
            .sort({ createdAt: -1 })
            .limit(5)
            .select("payoutId requestedAmount netAmount commissionDeducted status createdAt processedAt");
        return res.status(http_status_codes_1.StatusCodes.OK).json({
            success: true,
            data: {
                esewaId: vendor.esewaId,
                commissionRate: 10,
                processingFee: 2,
                totalDeduction: 12,
                recentPayouts: payouts,
            },
        });
    }
    catch (error) {
        console.error("Get vendor billing error:", error);
        return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: "Server error",
        });
    }
};
exports.getVendorBilling = getVendorBilling;
