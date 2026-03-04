import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import User from "../user/user.model";
import Vendor from "../vendor/vendor.model";
import { Payout } from "../payout/payout.model";
import bcrypt from "bcrypt";

// GET /vendor/settings/profile
export const getVendorProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    const user = await User.findById(userId).select("-password");
    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: "User not found",
      });
    }

    const vendor = await Vendor.findOne({ userId });
    if (!vendor) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: "Vendor profile not found",
      });
    }

    return res.status(StatusCodes.OK).json({
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
  } catch (error) {
    console.error("Get vendor profile error:", error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Server error",
    });
  }
};

// PATCH /vendor/settings/profile
export const updateVendorProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const {
      name,
      email,
      phoneNumber,
      storeName,
      address,
      province,
      district,
      storeLogoUrl,
      esewaId,
    } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: "User not found",
      });
    }

    const vendor = await Vendor.findOne({ userId });
    if (!vendor) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: "Vendor profile not found",
      });
    }

    // Update user fields
    if (name) user.name = name;
    if (phoneNumber !== undefined) user.phoneNumber = phoneNumber;
    if (email && email !== user.email) {
      const existing = await User.findOne({ email });
      if (existing) {
        return res.status(StatusCodes.CONFLICT).json({
          success: false,
          message: "Email already in use",
        });
      }
      user.email = email;
    }
    await user.save();

    // Update vendor fields
    if (storeName) vendor.storeName = storeName;
    if (address) vendor.address = address;
    if (province) vendor.province = province;
    if (district) vendor.district = district;
    if (storeLogoUrl !== undefined) vendor.storeLogoUrl = storeLogoUrl;
    if (esewaId) vendor.esewaId = esewaId;
    await vendor.save();

    return res.status(StatusCodes.OK).json({
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
  } catch (error) {
    console.error("Update vendor profile error:", error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Server error",
    });
  }
};

// PATCH /vendor/settings/password
export const updateVendorPassword = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "Current password and new password are required",
      });
    }

    if (newPassword.length < 6) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "New password must be at least 6 characters",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: "User not found",
      });
    }

    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (error) {
    console.error("Update vendor password error:", error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Server error",
    });
  }
};

// GET /vendor/settings/billing
export const getVendorBilling = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    const vendor = await Vendor.findOne({ userId });
    if (!vendor) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: "Vendor not found",
      });
    }

    // Last 5 payouts as billing history
    const payouts = await Payout.find({ vendorId: vendor._id })
      .sort({ createdAt: -1 })
      .limit(5)
      .select(
        "payoutId requestedAmount netAmount commissionDeducted status createdAt processedAt",
      );

    return res.status(StatusCodes.OK).json({
      success: true,
      data: {
        esewaId: vendor.esewaId,
        commissionRate: 10,
        processingFee: 2,
        totalDeduction: 12,
        recentPayouts: payouts,
      },
    });
  } catch (error) {
    console.error("Get vendor billing error:", error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Server error",
    });
  }
};
