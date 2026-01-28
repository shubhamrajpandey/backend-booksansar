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

//approve vendor
export const approveVendor = async (req: Request, res: Response) => {
  try {
    const vendorId = req.params.id;
    if (!vendorId) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "Vendor ID required",
      });
    }

    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    if (vendor.approved) {
      return res.status(400).json({
        success: false,
        message: "Vendor already approved",
      });
    }

    vendor.approved = true;
    await vendor.save();

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Vendor approved successfully",
      data: vendor,
    });
  } catch (error) {
    console.error("Approve vendor error:", error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Server error",
    });
  }
};

//send email to vendor when approved
export const notifyVendorApprova = async (req: Request, res: Response) => {
  try {
    const { email, storeName } = req.body;

    if (!email || !storeName) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "Email and store name are required",
      });
    }

    await sendEmail(
      email,
      "Vendor Application Approved - BookSansar",
      `Vendor Application Approved`,
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
       <div style="padding:32px 24px; text-align:center; color:#1f2937;">
       <h2 style="margin-bottom:12px; color:#321874;">
        Vendor Application Approved 
       </h2>

       <p style="margin:0 0 20px; font-size:15px; line-height:1.6; color:#4b5563;">
        Dear <strong>${storeName}</strong>,
       </p>

       <p style="margin:0 0 24px; font-size:15px; line-height:1.6; color:#4b5563;">
        Congratulations! Your vendor application has been successfully approved.
        You can now start listing and managing your products on <strong>BookSansar</strong>.
       </p>

       <!-- Info Box -->
       <div style="background:#fdfaf6; border:2px solid #E68A00; border-radius:10px; padding:18px 24px; margin:24px 0;">
        <p style="margin:0; font-size:15px; color:#374151; line-height:1.6;">
          Please log in to your vendor account using the email address and password
          you provided during the registration process.
        </p>
       </div>

       <p style="margin-top:20px; font-size:14px; color:#6b7280;">
        If you have any questions, feel free to contact our support team.
       </p>
       </div>

       <!-- Footer -->
       <div style="background-color:#f9fafb; text-align:center; padding:16px; font-size:13px; color:#9ca3af;">
      &copy; 2025 <span style="color:#321874; font-weight:600;">BookSansar</span>. All rights reserved.
      </div>
      </div>

      <!-- Google Fonts -->
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Sedgwick+Ave&display=swap" rel="stylesheet">
  `,
    );

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Approval email sent to vendor successfully",
    });
  } catch (error) {
    console.error("Notify vendor approval error:", error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Server error",
    });
  }
};
