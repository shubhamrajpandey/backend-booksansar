import { StatusCodes } from "http-status-codes";
import { Response, Request } from "express";
import User from "../models/user.model";
import Vendor from "../models/vendor.model";
import sendEmail from "../services/mail.service";
import Category from "../models/category.model";
import Book from "../models/book.model";

export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const user = await User.find();
    const { search, role } = req.query;

    if (role) {
      const filteredUsers = user.filter((usr) => usr.role === role);

      if (role === "vendor") {
        const vendorsWithDetails = await Promise.all(
          filteredUsers.map(async (vendor) => {
            const vendorDetails = await Vendor.findOne({ userId: vendor._id });
            return {
              ...vendor.toObject(),
              kycStatus: vendorDetails?.status || "not_submitted",
              vendorDetailsId: vendorDetails?._id || null,
            };
          }),
        );

        return res.status(StatusCodes.OK).json({
          success: true,
          message: "Users fetched successfully",
          data: vendorsWithDetails,
        });
      }

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

    <div style="background-color:#321874; color:#ffffff; text-align:center; padding:24px 0;">
      <h1 style="margin:0; font-size:28px; font-family:'Sedgwick Ave', cursive; letter-spacing:1px;">
        <span style="color:#ffffff;">Book</span><span style="color:#E68A00;">Sansar</span>
      </h1>
      <p style="margin:6px 0 0; font-size:14px; color:#e0e0e0;">
        Your digital reading companion
      </p>
    </div>

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

//get add detail of vendor before approval
export const getVendorDetails = async ( req: Request, res: Response) =>{
  try {
    const { id } = req.params;
    const vendor = await Vendor.find({userId: id});
    if (!vendor) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: "Vendor not found",
      });
    }
    
    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Vendor details fetched successfully",
      data: vendor,
    });
  } catch (error) {
    console.error("Error fetching vendor details:", error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Server error",
    });
  }
}

export const updateUserAccountStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["active", "suspended"].includes(status)) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "Invalid account status",
      });
    }

    const user = await User.findById(id);

    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.accountStatus === status) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: `User is already ${status}`,
      });
    }

    user.accountStatus = status;
    await user.save();

    return res.status(StatusCodes.OK).json({
      success: true,
      message: `User account ${status} successfully`,
      data: {
        id: user._id,
        status: user.accountStatus,
      },
    });
  } catch (error) {
    console.error("Update account status error:", error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Server error",
    });
  }
};

export const getAllCategories = async (req: Request, res: Response) => {
  try {
    const categories = await Category.find().sort({ name: 1 });

    return res.status(StatusCodes.OK).json({
      success: true,
      data: categories,
      count: categories.length,
    });
  } catch (error) {
    console.error("Error fetching categories:", error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Server error",
    });
  }
};

export const getCategoryById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const category = await Category.findById(id);

    if (!category) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: "Category not found",
      });
    }

    return res.status(StatusCodes.OK).json({
      success: true,
      data: category,
    });
  } catch (error) {
    console.error("Error fetching category:", error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Server error",
    });
  }
};

export const addCategory = async (req: Request, res: Response) => {
  try {
    const { name, description } = req.body;

    if (!name || name.trim() === "") {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "Category name is required",
      });
    }

    const slug = name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-");

    const existingCategory = await Category.findOne({
      $or: [{ name: name.trim() }, { slug }],
    });

    if (existingCategory) {
      return res.status(StatusCodes.CONFLICT).json({
        success: false,
        message: "Category already exists",
      });
    }

    const category = await Category.create({
      name: name.trim(),
      slug,
      description: description?.trim(),
    });

    return res.status(StatusCodes.CREATED).json({
      success: true,
      message: "Category created successfully",
      data: category,
    });
  } catch (error) {
    console.error("Error creating category:", error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Server error",
    });
  }
};

export const updateCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, isActive } = req.body;

    const category = await Category.findById(id);

    if (!category) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: "Category not found",
      });
    }

    if (name && name.trim() !== category.name) {
      const slug = name
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, "")
        .replace(/\s+/g, "-");

      const existingCategory = await Category.findOne({
        _id: { $ne: id },
        $or: [{ name: name.trim() }, { slug }],
      });

      if (existingCategory) {
        return res.status(StatusCodes.CONFLICT).json({
          success: false,
          message: "Category name already exists",
        });
      }

      category.name = name.trim();
      category.slug = slug;
    }

    if (description !== undefined) {
      category.description = description?.trim();
    }

    if (isActive !== undefined) {
      category.isActive = isActive;
    }

    await category.save();

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Category updated successfully",
      data: category,
    });
  } catch (error) {
    console.error("Error updating category:", error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Server error",
    });
  }
};

export const deleteCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const category = await Category.findById(id);

    if (!category) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: "Category not found",
      });
    }

    const booksCount = await Book.countDocuments({ category: category.name });

    if (booksCount > 0) {
      return res.status(StatusCodes.CONFLICT).json({
        success: false,
        message: `Cannot delete category. ${booksCount} book(s) are using this category`,
      });
    }

    await Category.findByIdAndDelete(id);

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Category deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting category:", error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Server error",
    });
  }
};

export const getActiveCategories = async (req: Request, res: Response) => {
  try {
    const categories = await Category.find({ isActive: true }).sort({
      name: 1,
    });

    return res.status(StatusCodes.OK).json({
      success: true,
      data: categories,
    });
  } catch (error) {
    console.error("Error fetching active categories:", error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Server error",
    });
  }
};

export const moderateFreeBook = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { action } = req.body;

  if (!["approve", "reject"].includes(action)) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      success: false,
      message: "Invalid action. Use 'approve' or 'reject'",
    });
  }

  const book = await Book.findById(id);

  if (!book) {
    return res.status(StatusCodes.NOT_FOUND).json({
      success: false,
      message: "Book not found",
    });
  }

  if (book.type !== "free") {
    return res.status(StatusCodes.BAD_REQUEST).json({
      success: false,
      message: "Only free books require admin approval",
    });
  }

  if (book.visibility !== "pending") {
    return res.status(StatusCodes.BAD_REQUEST).json({
      success: false,
      message: `Book is already ${book.visibility}`,
    });
  }

  book.visibility = action === "approve" ? "public" : "blocked";
  await book.save();

  res.status(StatusCodes.OK).json({
    success: true,
    message:
      action === "approve"
        ? "Free book approved and is now public"
        : "Free book rejected",
    data: book,
  });
};

export const getPendingFreeBooks = async (req: Request, res: Response) => {
  try {
    const pendingBooks = await Book.find({
      type: "free",
      visibility: "pending",
    });

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Pending free books fetched successfully",
      data: pendingBooks,
    });
  } catch (error) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Server error",
    });
  }
};
