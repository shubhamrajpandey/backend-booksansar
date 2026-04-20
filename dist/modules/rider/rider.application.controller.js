"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.rejectApplication = exports.approveApplication = exports.getApplicationById = exports.getAllApplications = exports.applyAsRider = void 0;
const http_status_codes_1 = require("http-status-codes");
const bcrypt_1 = __importDefault(require("bcrypt"));
const crypto_1 = __importDefault(require("crypto"));
const rider_application_model_1 = __importDefault(require("./rider.application.model"));
const user_model_1 = __importDefault(require("../user/user.model"));
const mail_service_1 = require("../../services/mail.service");
// ─────────────────────────────────────────────────────────────
// Helper: generate a readable random password
// e.g. "Rider@4829" — easy to type on first login
// ─────────────────────────────────────────────────────────────
const generateTempPassword = () => {
    const digits = crypto_1.default.randomInt(1000, 9999).toString();
    return `Rider@${digits}`;
};
// ─────────────────────────────────────────────────────────────
// POST /api/rider/apply  (public — no auth needed)
// Rider submits application form
// ─────────────────────────────────────────────────────────────
const applyAsRider = async (req, res) => {
    try {
        const { fullName, email, phone, age, address, district, esewaId, vehicleType, licenseNumber, experience, availability, message, licenseUrl, } = req.body;
        if (!fullName ||
            !email ||
            !phone ||
            !age ||
            !address ||
            !district ||
            !esewaId ||
            !vehicleType ||
            !licenseNumber ||
            !experience ||
            !availability ||
            !licenseUrl) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                success: false,
                message: "All required fields must be filled.",
            });
        }
        const existing = await rider_application_model_1.default.findOne({ email });
        if (existing) {
            if (existing.status === "pending") {
                return res.status(http_status_codes_1.StatusCodes.CONFLICT).json({
                    success: false,
                    message: "An application with this email is already under review.",
                });
            }
            if (existing.status === "approved") {
                return res.status(http_status_codes_1.StatusCodes.CONFLICT).json({
                    success: false,
                    message: "This email is already registered as a rider.",
                });
            }
            await rider_application_model_1.default.deleteOne({ email });
        }
        const existingUser = await user_model_1.default.findOne({ email });
        if (existingUser) {
            return res.status(http_status_codes_1.StatusCodes.CONFLICT).json({
                success: false,
                message: "An account with this email already exists.",
            });
        }
        const application = await rider_application_model_1.default.create({
            fullName,
            email,
            phone,
            age: Number(age),
            address,
            district,
            esewaId,
            vehicleType,
            licenseNumber,
            experience,
            availability,
            message,
            licenseUrl,
            status: "pending",
        });
        return res.status(http_status_codes_1.StatusCodes.CREATED).json({
            success: true,
            message: "Application submitted successfully! We will review and get back to you within 2–3 business days.",
            data: { applicationId: application._id },
        });
    }
    catch (error) {
        if (error instanceof Error) {
            return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message,
            });
        }
        return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: "An unexpected error occurred.",
        });
    }
};
exports.applyAsRider = applyAsRider;
// ─────────────────────────────────────────────────────────────
// GET /api/rider/applications  (admin only)
// ─────────────────────────────────────────────────────────────
const getAllApplications = async (req, res) => {
    try {
        const { status, page = 1, limit = 20 } = req.query;
        const filter = {};
        if (status &&
            ["pending", "approved", "rejected"].includes(status)) {
            filter.status = status;
        }
        const skip = (Number(page) - 1) * Number(limit);
        const [applications, total] = await Promise.all([
            rider_application_model_1.default.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(Number(limit))
                .lean(),
            rider_application_model_1.default.countDocuments(filter),
        ]);
        return res.status(http_status_codes_1.StatusCodes.OK).json({
            success: true,
            data: applications,
            pagination: {
                total,
                page: Number(page),
                limit: Number(limit),
                pages: Math.ceil(total / Number(limit)),
            },
        });
    }
    catch (error) {
        if (error instanceof Error) {
            return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message,
            });
        }
        return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: "An unexpected error occurred.",
        });
    }
};
exports.getAllApplications = getAllApplications;
// ─────────────────────────────────────────────────────────────
// GET /api/rider/applications/:id  (admin only)
// ─────────────────────────────────────────────────────────────
const getApplicationById = async (req, res) => {
    try {
        const application = await rider_application_model_1.default.findById(req.params.id).lean();
        if (!application) {
            return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json({
                success: false,
                message: "Application not found.",
            });
        }
        return res.status(http_status_codes_1.StatusCodes.OK).json({
            success: true,
            data: application,
        });
    }
    catch (error) {
        if (error instanceof Error) {
            return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message,
            });
        }
        return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: "An unexpected error occurred.",
        });
    }
};
exports.getApplicationById = getApplicationById;
// ─────────────────────────────────────────────────────────────
// PATCH /api/rider/applications/:id/approve  (admin only)
// Creates User with role "rider" + isFirstLogin: true + sends email
// ─────────────────────────────────────────────────────────────
const approveApplication = async (req, res) => {
    try {
        const application = await rider_application_model_1.default.findById(req.params.id);
        if (!application) {
            return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json({
                success: false,
                message: "Application not found.",
            });
        }
        if (application.status === "approved") {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                success: false,
                message: "Application is already approved.",
            });
        }
        const tempPassword = generateTempPassword();
        const salt = await bcrypt_1.default.genSalt(10);
        const hashedPassword = await bcrypt_1.default.hash(tempPassword, salt);
        // ── KEY CHANGE: isFirstLogin: true ──────────────────────
        // This tells the mobile app to force the change-password
        // screen before the rider can access the home screen
        const riderUser = await user_model_1.default.create({
            name: application.fullName,
            email: application.email,
            password: hashedPassword,
            phoneNumber: application.phone,
            role: "rider",
            location: `${application.address}, ${application.district}`,
            accountStatus: "active",
            isFirstLogin: true, // ← only change from before
        });
        application.status = "approved";
        application.riderId = riderUser._id;
        await application.save();
        await (0, mail_service_1.sendRiderApprovalEmail)({
            to: application.email,
            name: application.fullName,
            tempPassword,
        });
        return res.status(http_status_codes_1.StatusCodes.OK).json({
            success: true,
            message: `Application approved. Login credentials sent to ${application.email}.`,
            data: {
                riderId: riderUser._id,
                email: riderUser.email,
            },
        });
    }
    catch (error) {
        if (error instanceof Error) {
            return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message,
            });
        }
        return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: "An unexpected error occurred.",
        });
    }
};
exports.approveApplication = approveApplication;
// ─────────────────────────────────────────────────────────────
// PATCH /api/rider/applications/:id/reject  (admin only)
// ─────────────────────────────────────────────────────────────
const rejectApplication = async (req, res) => {
    try {
        const { reason } = req.body;
        const application = await rider_application_model_1.default.findById(req.params.id);
        if (!application) {
            return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json({
                success: false,
                message: "Application not found.",
            });
        }
        if (application.status === "approved") {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                success: false,
                message: "Cannot reject an already approved application.",
            });
        }
        const rejectionReason = reason || "Does not meet requirements at this time.";
        application.status = "rejected";
        application.rejectionReason = rejectionReason;
        await application.save();
        await (0, mail_service_1.sendRiderRejectionEmail)({
            to: application.email,
            name: application.fullName,
            reason: rejectionReason,
        });
        return res.status(http_status_codes_1.StatusCodes.OK).json({
            success: true,
            message: "Application rejected and email sent to applicant.",
        });
    }
    catch (error) {
        if (error instanceof Error) {
            return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message,
            });
        }
        return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: "An unexpected error occurred.",
        });
    }
};
exports.rejectApplication = rejectApplication;
