import { StatusCodes } from "http-status-codes";
import { Response, Request } from "express";
import User from "../models/user.model";
import Vendor from "../models/vendor.model";
import sendEmail from "../services/mail.service";

//get users(learner,vendor) by filtering
export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const user = await User.find();
    const { search, role } = req.query;

    if (role) {
      const filteredUsers = user.filter((usr) => usr.role === role);
      return res.status(StatusCodes.OK).json({
        success: true,
        message: "Users fetched successfully",
        data: filteredUsers,
      });
    }

    if (search && typeof search === "string") {
      if (!user || user.length === 0) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "No users found",
        });
      }

      const searchedUsers = user.filter(
        (usr) =>
          usr.name.toLowerCase().includes(search.toLowerCase()) ||
          usr.email.toLowerCase().includes(search.toLowerCase()),
      );

      return res.status(StatusCodes.OK).json({
        success: true,
        message: "Users fetched successfully",
        data: searchedUsers,
      });
    }

    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: "No users found",
      });
    }

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Users fetched successfully",
      data: user,
    });
  } catch (error) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Server error",
    });
  }
};

//suspend user
export const deleteUser = async (req: Request, res: Response) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Server error",
    });
  }
};

//approve vendor and send email notification
export const updateVendorStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!id || !status) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "Vendor ID and status are required",
      });
    }

    if (!["pending", "approved", "rejected"].includes(status)) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "Invalid status value",
      });
    }

    const vendor = await Vendor.findById(id).populate("userId", "email");
    if (!vendor) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: "Vendor not found",
      });
    }

    if (vendor.status === status) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: `Vendor is already ${status}`,
      });
    }

    vendor.status = status;
    await vendor.save();

    if (typeof vendor.userId !== "object" || !("email" in vendor.userId)) {
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Vendor user email not populated",
      });
    }

    const email = vendor.userId.email;
    const { storeName } = vendor;

    let subject = "";
    let heading = "";
    let bodyMessage = "";
    let extraMessage = "";

    switch (status) {
      case "approved":
        subject = "Vendor Application Approved - BookSansar";
        heading = "Vendor Application Approved";
        bodyMessage =
          "Congratulations! Your vendor application has been approved. You can now start selling on BookSansar.";
        extraMessage = `
      <p style="margin-top:20px; font-size:14px; color:#4b5563;">
        Please log in to your vendor account using the email address and password
        you provided during the registration process.
      </p>
    `;
        break;

      case "rejected":
        subject = "Vendor Application Rejected - BookSansar";
        heading = "Vendor Application Rejected";
        bodyMessage =
          "Unfortunately, your vendor application was rejected after review. You may contact support for more details.";
        break;

      case "pending":
        subject = "Vendor Application Under Review - BookSansar";
        heading = "Vendor Application Under Review";
        bodyMessage =
          "Your vendor application is currently under review. We will notify you once a decision is made.";
        break;
    }

    await sendEmail(
      email,
      subject,
      heading,
      `
  <div style="font-family:'Inter', Arial, sans-serif; max-width:600px; margin:auto; border:1px solid #e5e7eb; border-radius:12px; overflow:hidden; box-shadow:0 4px 12px rgba(0,0,0,0.08);">

    <!-- Header -->
    <div style="background-color:#321874; color:#ffffff; text-align:center; padding:24px 0;">
      <h1 style="margin:0; font-size:28px; font-family:'Sedgwick Ave', cursive; letter-spacing:1px;">
        <span style="color:#ffffff;">Book</span><span style="color:#E68A00;">Sansar</span>
      </h1>
      <p style="margin:6px 0 0; font-size:14px; color:#e0e0e0;">
        Your digital reading companion
      </p>
    </div>

    <!-- Body -->
    <div style="padding:32px 24px; color:#1f2937;">
      <h2 style="margin-bottom:12px; color:#321874; text-align:center;">
        ${heading}
      </h2>

      <p style="font-size:15px; line-height:1.6; color:#4b5563;">
        Dear <strong>${storeName}</strong>,
      </p>

      <p style="font-size:15px; line-height:1.6; color:#4b5563;">
        ${bodyMessage}
      </p>

      ${extraMessage || ""}

    </div>

    <!-- Footer -->
    <div style="background-color:#f9fafb; text-align:center; padding:16px; font-size:13px; color:#9ca3af;">
      &copy; 2025 <span style="color:#321874; font-weight:600;">BookSansar</span>. All rights reserved.
    </div>
  </div>

  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Sedgwick+Ave&display=swap" rel="stylesheet">
  `,
    );

    return res.status(StatusCodes.OK).json({
      success: true,
      message: `Vendor ${status} successfully and notified`,
      data: vendor,
    });
  } catch (error) {
    console.error("Update vendor status error:", error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Server error",
    });
  }
};
