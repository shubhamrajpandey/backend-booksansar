import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import bcrypt from "bcrypt";
import crypto from "crypto";
import mongoose from "mongoose";
import RiderApplication from "./rider.application.model";
import User from "../user/user.model";
import {
  sendRiderApprovalEmail,
  sendRiderRejectionEmail,
} from "../../services/mail.service";

// ─────────────────────────────────────────────────────────────
// Helper: generate a readable random password
// e.g. "Rider@4829" — easy to type on first login
// ─────────────────────────────────────────────────────────────
const generateTempPassword = (): string => {
  const digits = crypto.randomInt(1000, 9999).toString();
  return `Rider@${digits}`;
};

// ─────────────────────────────────────────────────────────────
// POST /api/rider/apply  (public — no auth needed)
// Rider submits application form
// ─────────────────────────────────────────────────────────────
export const applyAsRider = async (req: Request, res: Response) => {
  try {
    const {
      fullName,
      email,
      phone,
      age,
      address,
      district,
      esewaId,
      vehicleType,
      licenseNumber,
      experience,
      availability,
      message,
      licenseUrl,
    } = req.body;

    if (
      !fullName ||
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
      !licenseUrl
    ) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "All required fields must be filled.",
      });
    }

    const existing = await RiderApplication.findOne({ email });
    if (existing) {
      if (existing.status === "pending") {
        return res.status(StatusCodes.CONFLICT).json({
          success: false,
          message: "An application with this email is already under review.",
        });
      }
      if (existing.status === "approved") {
        return res.status(StatusCodes.CONFLICT).json({
          success: false,
          message: "This email is already registered as a rider.",
        });
      }
      await RiderApplication.deleteOne({ email });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(StatusCodes.CONFLICT).json({
        success: false,
        message: "An account with this email already exists.",
      });
    }

    const application = await RiderApplication.create({
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

    return res.status(StatusCodes.CREATED).json({
      success: true,
      message:
        "Application submitted successfully! We will review and get back to you within 2–3 business days.",
      data: { applicationId: application._id },
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message,
      });
    }
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "An unexpected error occurred.",
    });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/rider/applications  (admin only)
// ─────────────────────────────────────────────────────────────
export const getAllApplications = async (req: Request, res: Response) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;

    const filter: Record<string, string> = {};
    if (
      status &&
      ["pending", "approved", "rejected"].includes(status as string)
    ) {
      filter.status = status as string;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [applications, total] = await Promise.all([
      RiderApplication.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      RiderApplication.countDocuments(filter),
    ]);

    return res.status(StatusCodes.OK).json({
      success: true,
      data: applications,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message,
      });
    }
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "An unexpected error occurred.",
    });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/rider/applications/:id  (admin only)
// ─────────────────────────────────────────────────────────────
export const getApplicationById = async (req: Request, res: Response) => {
  try {
    const application = await RiderApplication.findById(req.params.id).lean();

    if (!application) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: "Application not found.",
      });
    }

    return res.status(StatusCodes.OK).json({
      success: true,
      data: application,
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message,
      });
    }
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "An unexpected error occurred.",
    });
  }
};

// ─────────────────────────────────────────────────────────────
// PATCH /api/rider/applications/:id/approve  (admin only)
// Creates User with role "rider" + isFirstLogin: true + sends email
// ─────────────────────────────────────────────────────────────
export const approveApplication = async (req: Request, res: Response) => {
  try {
    const application = await RiderApplication.findById(req.params.id);

    if (!application) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: "Application not found.",
      });
    }

    if (application.status === "approved") {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "Application is already approved.",
      });
    }

    const tempPassword = generateTempPassword();
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(tempPassword, salt);

    // ── KEY CHANGE: isFirstLogin: true ──────────────────────
    // This tells the mobile app to force the change-password
    // screen before the rider can access the home screen
    const riderUser = await User.create({
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
    application.riderId = riderUser._id as mongoose.Types.ObjectId;
    await application.save();

    await sendRiderApprovalEmail({
      to: application.email,
      name: application.fullName,
      tempPassword,
    });

    return res.status(StatusCodes.OK).json({
      success: true,
      message: `Application approved. Login credentials sent to ${application.email}.`,
      data: {
        riderId: riderUser._id,
        email: riderUser.email,
      },
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message,
      });
    }
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "An unexpected error occurred.",
    });
  }
};

// ─────────────────────────────────────────────────────────────
// PATCH /api/rider/applications/:id/reject  (admin only)
// ─────────────────────────────────────────────────────────────
export const rejectApplication = async (req: Request, res: Response) => {
  try {
    const { reason } = req.body;

    const application = await RiderApplication.findById(req.params.id);

    if (!application) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: "Application not found.",
      });
    }

    if (application.status === "approved") {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "Cannot reject an already approved application.",
      });
    }

    const rejectionReason: string =
      reason || "Does not meet requirements at this time.";

    application.status = "rejected";
    application.rejectionReason = rejectionReason;
    await application.save();

    await sendRiderRejectionEmail({
      to: application.email,
      name: application.fullName,
      reason: rejectionReason,
    });

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Application rejected and email sent to applicant.",
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message,
      });
    }
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "An unexpected error occurred.",
    });
  }
};
