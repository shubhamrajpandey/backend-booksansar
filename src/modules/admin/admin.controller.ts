import { StatusCodes } from "http-status-codes";
import { Response, Request } from "express";
import User from "../user/user.model";
import Vendor from "../vendor/vendor.model";
import sendEmail from "../../services/mail.service";
import Category from "../taxonomy/category.model";
import Book from "../book/book.model";
import mongoose from "mongoose";
import { getLastBackupTime } from "../../utils/platform.utils";
import Genre from "../taxonomy/genre.model";

// Users
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
export const getVendorDetails = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const vendor = await Vendor.find({ userId: id });
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
};

//update user account status (active/suspended)
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

// Categories
export const getAllCategories = async (req: Request, res: Response) => {
  try {
    // const page = Number(req.query.page) || 1;
    // const limit = Number(req.query.limit) || 8;

    // const safePage = page < 1 ? 1 : page;
    // const safeLimit = limit < 1 ? 8 : limit > 50 ? 50 : limit;
    // const skip = (safePage - 1) * safeLimit;

    // const totalCategories = await Category.countDocuments();

    const categories = await Category.find().sort({ name: 1 });
    // .skip(skip)
    // .limit(safeLimit);

    const bookCounts = await Book.aggregate([
      {
        $match: {
          visibility: "public",
        },
      },
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 },
        },
      },
    ]);

    const countMap = new Map(bookCounts.map((item) => [item._id, item.count]));

    const categoriesWithCounts = categories.map((category) => ({
      _id: category._id,
      name: category.name,
      isActive: category.isActive,
      bookCount: countMap.get(category.name) || 0,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    }));

    return res.status(StatusCodes.OK).json({
      success: true,
      data: categoriesWithCounts,
      count: categoriesWithCounts.length,
      // page: safePage,
      // limit: safeLimit,
      // total: totalCategories,
      // totalPages: Math.ceil(totalCategories / safeLimit),
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

    const bookCount = await Book.countDocuments({
      category: category.name,
      visibility: "public",
    });

    return res.status(StatusCodes.OK).json({
      success: true,
      data: {
        _id: category._id,
        name: category.name,
        isActive: category.isActive,
        bookCount,
        createdAt: category.createdAt,
        updatedAt: category.updatedAt,
      },
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
      data: {
        _id: category._id,
        name: category.name,
        isActive: category.isActive,
        bookCount: 0,
        createdAt: category.createdAt,
        updatedAt: category.updatedAt,
      },
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
    const { name, isActive } = req.body;

    const category = await Category.findById(id);

    if (!category) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: "Category not found",
      });
    }

    const oldName = category.name;

    if (name && name.trim() !== category.name) {
      const existingCategory = await Category.findOne({
        name: name.trim(),
        _id: { $ne: id },
      });

      if (existingCategory) {
        return res.status(StatusCodes.CONFLICT).json({
          success: false,
          message: "Another category with this name already exists",
        });
      }

      category.name = name.trim();
    }

    if (isActive !== undefined) {
      category.isActive = isActive;
    }

    await category.save();

    if (oldName !== category.name) {
      await Book.updateMany(
        { category: oldName },
        { $set: { category: category.name } },
      );
    }

    const bookCount = await Book.countDocuments({
      category: category.name,
      visibility: "public",
    });

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Category updated successfully",
      data: {
        _id: category._id,
        name: category.name,
        isActive: category.isActive,
        bookCount,
        createdAt: category.createdAt,
        updatedAt: category.updatedAt,
      },
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

// Genres
export const getGenres = async (req: Request, res: Response) => {
  try {
    // const page = Number(req.query.page) || 1;
    // const limit = Number(req.query.limit) || 12;

    // const safePage = page < 1 ? 1 : page;
    // const safeLimit = limit < 1 ? 12 : limit > 50 ? 50 : limit;
    // const skip = (safePage - 1) * safeLimit;

    // const totalGenres = await Genre.countDocuments();

    const genres = await Genre.find().sort({ name: 1 });
    // .skip(skip)
    // .limit(safeLimit);

    const bookCounts = await Book.aggregate([
      {
        $match: {
          visibility: "public",
          genre: { $exists: true, $ne: null },
        },
      },
      {
        $group: {
          _id: "$genre",
          count: { $sum: 1 },
        },
      },
    ]);

    const countMap = new Map(bookCounts.map((item) => [item._id, item.count]));

    const genresWithCounts = genres.map((genre) => ({
      _id: genre._id,
      name: genre.name,
      isActive: genre.isActive,
      bookCount: countMap.get(genre.name) || 0,
      createdAt: genre.createdAt,
      updatedAt: genre.updatedAt,
    }));

    return res.status(StatusCodes.OK).json({
      success: true,
      data: genresWithCounts,
      count: genresWithCounts.length,
      // page: safePage,
      // limit: safeLimit,
      // total: totalGenres,
      // totalPages: Math.ceil(totalGenres / safeLimit),
    });
  } catch (error) {
    console.error("Error fetching genres:", error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Server error",
    });
  }
};

export const addGenre = async (req: Request, res: Response) => {
  try {
    const { name } = req.body;

    if (!name || name.trim() === "") {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "Genre name is required",
      });
    }

    const existingGenre = await Genre.findOne({ name: name.trim() });

    if (existingGenre) {
      return res.status(StatusCodes.CONFLICT).json({
        success: false,
        message: "Genre already exists",
      });
    }

    const genre = await Genre.create({ name: name.trim() });

    return res.status(StatusCodes.CREATED).json({
      success: true,
      message: "Genre created successfully",
      data: {
        _id: genre._id,
        name: genre.name,
        isActive: genre.isActive,
        bookCount: 0,
        createdAt: genre.createdAt,
        updatedAt: genre.updatedAt,
      },
    });
  } catch (error) {
    console.error("Error creating genre:", error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Server error",
    });
  }
};

export const deleteGenre = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const genre = await Genre.findById(id);

    if (!genre) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: "Genre not found",
      });
    }

    const booksCount = await Book.countDocuments({ genre: genre.name });

    if (booksCount > 0) {
      return res.status(StatusCodes.CONFLICT).json({
        success: false,
        message: `Cannot delete genre. ${booksCount} book(s) are using this genre`,
      });
    }

    await Genre.findByIdAndDelete(id);

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Genre deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting genre:", error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Server error",
    });
  }
};

export const updateGenre = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, isActive } = req.body;

    const genre = await Genre.findById(id);

    if (!genre) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: "Genre not found",
      });
    }

    const oldName = genre.name;

    if (name && name.trim() !== genre.name) {
      const existingGenre = await Genre.findOne({
        name: name.trim(),
        _id: { $ne: id },
      });

      if (existingGenre) {
        return res.status(StatusCodes.CONFLICT).json({
          success: false,
          message: "Another genre with this name already exists",
        });
      }

      genre.name = name.trim();
    }

    if (isActive !== undefined) {
      genre.isActive = isActive;
    }

    await genre.save();

    // Update genre name in all books if name changed
    if (oldName !== genre.name) {
      await Book.updateMany(
        { genre: oldName },
        { $set: { genre: genre.name } },
      );
    }

    // Get book count
    const bookCount = await Book.countDocuments({
      genre: genre.name,
      visibility: "public",
    });

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Genre updated successfully",
      data: {
        _id: genre._id,
        name: genre.name,
        isActive: genre.isActive,
        bookCount,
        createdAt: genre.createdAt,
        updatedAt: genre.updatedAt,
      },
    });
  } catch (error) {
    console.error("Error updating genre:", error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Server error",
    });
  }
};

//get active categories for book addition
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

//moderate free book and second-hand for admin approval
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

  if (!["free", "second-hand", "free-notes"].includes(book.type)) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      success: false,
      message:
        "Only free, free-notes, and second-hand books require admin approval",
    });
  }

  if (book.visibility !== "pending") {
    return res.status(StatusCodes.BAD_REQUEST).json({
      success: false,
      message: `Book is already ${book.visibility}`,
    });
  }

  book.visibility = action === "approve" ? "public" : "rejected";
  await book.save();

  return res.status(StatusCodes.OK).json({
    success: true,
    message:
      action === "approve"
        ? "Book approved and is now public"
        : "Book rejected",
    data: book,
  });
};

//get pending free books for admin approval
export const getPendingFreeBooks = async (req: Request, res: Response) => {
  try {
    const pendingBooks = await Book.find({
      type: { $in: ["free", "second-hand", "free-notes"] },
      visibility: "pending",
    }).populate("uploader", "name email role");

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Pending books fetched successfully",
      data: pendingBooks,
    });
  } catch (error) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Server error",
    });
  }
};

// //get pending second-hand books for admin approval
// export const getPendingSecondHandBooks = async (req: Request, res: Response) => {
//   try {
//     const pendingBooks = await Book.find({
//       type: "second-hand",
//       visibility: "pending",
//     });

//     return res.status(StatusCodes.OK).json({
//       success: true,
//       message: "Pending second-hand books fetched successfully",
//       data: pendingBooks,
//     });
//   } catch (error) {
//     return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
//       success: false,
//       message: "Server error",
//     });
//   }
// }

// Admin Profile
export const getAdminProfile = async (req: Request, res: Response) => {
  try {
    const adminId = req.user?.id;

    const admin = await User.findById(adminId).select("-password");

    if (!admin) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: "Admin not found",
      });
    }

    if (admin.role !== "admin") {
      return res.status(StatusCodes.FORBIDDEN).json({
        success: false,
        message: "Access denied. Admin role required",
      });
    }

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Admin profile fetched successfully",
      data: admin,
    });
  } catch (error) {
    console.error("Error fetching admin profile:", error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Server error",
    });
  }
};

// Update admin profile
export const updateAdminProfile = async (req: Request, res: Response) => {
  try {
    const adminId = req.user?.id;
    const { name, email, phoneNumber } = req.body;

    const admin = await User.findById(adminId);

    if (!admin) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: "Admin not found",
      });
    }

    if (admin.role !== "admin") {
      return res.status(StatusCodes.FORBIDDEN).json({
        success: false,
        message: "Access denied. Admin role required",
      });
    }

    if (email && email !== admin.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(StatusCodes.CONFLICT).json({
          success: false,
          message: "Email already in use",
        });
      }
      admin.email = email;
    }

    if (name) admin.name = name;
    if (phoneNumber !== undefined) admin.phoneNumber = phoneNumber;

    await admin.save();

    const { password, ...updatedAdmin } = admin.toObject();

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Admin profile updated successfully",
      data: updatedAdmin,
    });
  } catch (error) {
    console.error("Error updating admin profile:", error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Server error",
    });
  }
};

// Update admin password
export const updateAdminPassword = async (req: Request, res: Response) => {
  try {
    const adminId = req.user?.id;
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
        message: "New password must be at least 6 characters long",
      });
    }

    const admin = await User.findById(adminId);

    if (!admin) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: "Admin not found",
      });
    }

    if (admin.role !== "admin") {
      return res.status(StatusCodes.FORBIDDEN).json({
        success: false,
        message: "Access denied. Admin role required",
      });
    }

    // Verify current password (you'll need bcrypt for this)
    const bcrypt = require("bcrypt");
    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      admin.password,
    );

    if (!isPasswordValid) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    admin.password = hashedPassword;
    await admin.save();

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (error) {
    console.error("Error updating admin password:", error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Server error",
    });
  }
};

// Platform Stats
export const getPlatformStats = async (req: Request, res: Response) => {
  try {
    const dbStatus =
      mongoose.connection.readyState === 1 ? "Connected" : "Disconnected";
    const platformVersion = process.env.PLATFORM_VERSION || "1.0.0";

    const uptimeSeconds = process.uptime();
    const uptimePercentage = "99.8%";

    const lastBackup = await getLastBackupTime();

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Platform stats fetched successfully",
      data: {
        platformVersion,
        databaseStatus: dbStatus,
        lastBackup,
        uptime: uptimePercentage,
        uptimeSeconds,
      },
    });
  } catch (error) {
    console.error("Error fetching platform stats:", error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Server error",
    });
  }
};
