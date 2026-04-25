import { StatusCodes } from "http-status-codes";
import { Request, Response } from "express";
import Book from "../book/book.model";
import Vendor from "../vendor/vendor.model";
import User from "../user/user.model";
import { sendNotification } from "../notification/fcm.service";
import logger from "../../utils/logger";

// ── Notify all admins when a book needs review ────────────────
async function notifyAdminsBookPending(
  bookId: string,
  bookTitle: string,
  uploaderName: string,
) {
  const admins = await User.find({ role: "admin", accountStatus: "active" })
    .select("_id")
    .lean();

  logger.info(`📚 Found ${admins.length} admins to notify for book: "${bookTitle}"`);

  for (const admin of admins) {
    const adminId = String((admin as any)._id);
    logger.info(`📨 Sending book_pending notification to admin=${adminId}`);
    await sendNotification({
      userId: adminId,
      title: "New Book Pending Approval 📋",
      body: `"${bookTitle}" by ${uploaderName} needs review.`,
      type: "book_pending",
      data: { bookId, link: "/admin/books" },
    });
  }

  logger.info(`✅ Book pending notifications done for "${bookTitle}"`);
}

export const uploadBookDetails = async (req: Request, res: Response) => {
  try {
    logger.info(`📥 uploadBookDetails called by user=${req.user?.id}, role=${req.user?.role}`);

    if (!req.user) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        message: "Authentication required",
      });
    }

    const {
      type, title, author, category, genre, description,
      coverImage, additionalImages, pdfUrl, price, mrp, stock,
      condition, deliveryInfo, rating, language, edition,
      negotiable, sellerName, phone, location, printedPrice, bookType,
    } = req.body;

    logger.info(`📦 Book upload: type=${type}, title=${title}, author=${author}`);

    const uploader = req.user.id;
    const role = req.user.role;

    if (!type || !title || !author || !category) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "type, title, author, and category are required",
      });
    }

    if (!["free", "physical", "second-hand", "free-notes"].includes(type)) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "Invalid book type",
      });
    }

    if (type === "physical" && role !== "vendor" && role !== "admin") {
      return res.status(StatusCodes.FORBIDDEN).json({
        success: false,
        message: "Only vendors or admins can upload physical books",
      });
    }

    if (type === "second-hand" && role !== "learner" && role !== "admin") {
      return res.status(StatusCodes.FORBIDDEN).json({
        success: false,
        message: "Only learners or admins can upload second-hand books",
      });
    }

    if (type === "free" || type === "free-notes") {
      if (!pdfUrl) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: `${type === "free-notes" ? "Free notes" : "Free books"} must include a PDF URL`,
        });
      }
    }

    if (type === "physical") {
      if (price === undefined || stock === undefined || !deliveryInfo) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Physical books require price, stock, and delivery information",
        });
      }
      if (price < 0 || stock < 0) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Price and stock cannot be negative",
        });
      }
    }

    if (type === "second-hand") {
      if (price === undefined || !condition) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Second-hand books require price and condition",
        });
      }
      if (!["new", "used-good", "used-ok"].includes(condition)) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Invalid condition value",
        });
      }
    }

    let vendorId = undefined;
    if (type === "physical") {
      const vendor = await Vendor.findOne({ userId: uploader });
      if (!vendor) {
        return res.status(StatusCodes.FORBIDDEN).json({
          success: false,
          message: "Vendor profile not found. Please complete vendor registration.",
        });
      }
      vendorId = vendor._id;
    }

    let visibility: "public" | "pending" | "rejected";
    if (role === "admin") {
      visibility = "public";
    } else if (type === "physical") {
      visibility = "public";
    } else {
      visibility = "pending";
    }

    logger.info(`👁️ visibility=${visibility} for type=${type}, role=${role}`);

    let book: any;
    try {
      book = await Book.create({
        type, title: title.trim(), author: author.trim(), category, genre,
        description, coverImage, additionalImages, pdfUrl, price, mrp, stock,
        condition, deliveryInfo, rating, language, edition, negotiable,
        sellerName, phone, location, printedPrice, bookType,
        uploader, vendorId, visibility,
      });
      logger.info(`📖 Book created: "${book.title}", id=${book._id}, visibility=${visibility}`);
    } catch (bookErr: any) {
      logger.error(`❌ Book.create failed: ${bookErr.message}`);
      logger.error(`❌ Book.create error details: ${JSON.stringify(bookErr)}`);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: `Failed to create book: ${bookErr.message}`,
      });
    }

    // ── Notify admins when book needs approval ────────────────
    if (visibility === "pending") {
      try {
        const uploaderDoc = await User.findById(uploader).select("name").lean();
        const uploaderName = (uploaderDoc as any)?.name || "A user";
        logger.info(`📚 Book pending — notifying admins for: "${book.title}" by ${uploaderName}`);
        await notifyAdminsBookPending(
          String(book._id),
          book.title,
          uploaderName,
        );
      } catch (notifErr: any) {
        logger.error(`❌ notifyAdminsBookPending error: ${notifErr.message}`);
      }
    }

    return res.status(StatusCodes.CREATED).json({
      success: true,
      message: visibility === "pending"
        ? "Book uploaded and sent for admin approval"
        : "Book uploaded successfully",
      book,
    });
  } catch (error: any) {
    logger.error(`❌ uploadBookDetails FATAL: ${error.message}`);
    logger.error(`❌ Stack: ${error.stack}`);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message || "Failed to upload book",
    });
  }
};

export const getAllBooks = async (req: Request, res: Response) => {
  try {
    const {
      search, type, category, genre, location, author,
      minPrice, maxPrice, availability, visibility, sortBy,
      page = 1, limit = 10,
    } = req.query;

    const filter: any = {};

    if (req.user?.role === "admin" && visibility) {
      filter.visibility = visibility;
    } else {
      filter.visibility = "public";
    }

    if (type && typeof type === "string") {
      const types = type.split(",").map((t) => t.trim());
      filter.type = types.length > 1 ? { $in: types } : type;
    }

    if (availability === "in-stock") filter.stock = { $gt: 0 };
    if (availability === "out-of-stock") filter.stock = { $lte: 0 };

    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    if (category && typeof category === "string") {
      filter.category = { $in: category.split(",") };
    }

    if (genre && typeof genre === "string") {
      filter.genre = { $in: genre.split(",") };
    }

    if (location && typeof location === "string") filter.location = location;

    if (author && typeof author === "string") {
      filter.author = { $regex: author, $options: "i" };
    }

    if (search && typeof search === "string") {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { author: { $regex: search, $options: "i" } },
      ];
    }

    let sort: Record<string, 1 | -1> = { createdAt: -1 };
    if (sortBy && typeof sortBy === "string") {
      switch (sortBy) {
        case "price-low-high": sort = { price: 1 }; break;
        case "price-high-low": sort = { price: -1 }; break;
        case "rating-high-low": sort = { rating: -1 }; break;
        case "newest": sort = { createdAt: -1 }; break;
        case "title-a-z": sort = { title: 1 }; break;
        case "title-z-a": sort = { title: -1 }; break;
        default: sort = { createdAt: -1 }; break;
      }
    }

    const safePage = Number(page) > 0 ? Number(page) : 1;
    const safeLimit = Number(limit) > 0 && Number(limit) <= 100 ? Number(limit) : 10;
    const skip = (safePage - 1) * safeLimit;

    const books = await Book.find(filter)
      .populate("uploader", "name email role")
      .sort(sort)
      .skip(skip)
      .limit(safeLimit);

    const total = await Book.countDocuments(filter);

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Books retrieved successfully",
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(total / safeLimit),
      books,
    });
  } catch (error) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Server error",
    });
  }
};

export const getSingleBook = async (req: Request, res: Response) => {
  try {
    const filter: any = { _id: req.params.id };
    if (req.user?.role !== "admin") filter.visibility = "public";

    const book = await Book.findOne(filter).populate("uploader", "name email role");

    if (!book) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: "Book not found",
      });
    }

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Book retrieved successfully",
      book,
    });
  } catch (error) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Server error",
    });
  }
};

export const updateBookDetails = async (req: Request, res: Response) => {
  try {
    const allowedFields = [
      "title", "author", "category", "description", "price",
      "stock", "condition", "location", "language", "edition", "negotiable",
    ];

    const updates: any = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }

    const book = await Book.findById(req.params.id);
    if (!book) {
      return res.status(StatusCodes.NOT_FOUND).json({ success: false, message: "Book not found" });
    }

    if (req.user?.role !== "admin" && book.uploader.toString() !== req.user?.id) {
      return res.status(StatusCodes.FORBIDDEN).json({ success: false, message: "Not allowed" });
    }

    const updatedBook = await Book.findByIdAndUpdate(req.params.id, updates, {
      new: true, runValidators: true,
    });

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Book updated successfully",
      book: updatedBook,
    });
  } catch (error) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Server error",
    });
  }
};

export const deleteBookDetails = async (req: Request, res: Response) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) {
      return res.status(StatusCodes.NOT_FOUND).json({ success: false, message: "Book not found" });
    }

    if (req.user?.role !== "admin" && book.uploader.toString() !== req.user?.id) {
      return res.status(StatusCodes.FORBIDDEN).json({ success: false, message: "Not allowed" });
    }

    await book.deleteOne();

    return res.status(StatusCodes.OK).json({ success: true, message: "Book deleted successfully" });
  } catch (error) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Server error",
    });
  }
};

export const getMyBooks = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        message: "Authentication required",
      });
    }

    const { type, page = 1, limit = 20 } = req.query;
    const filter: any = { uploader: req.user.id };
    if (type && typeof type === "string") filter.type = type;

    const safePage = Number(page) > 0 ? Number(page) : 1;
    const safeLimit = Number(limit) > 0 && Number(limit) <= 100 ? Number(limit) : 20;
    const skip = (safePage - 1) * safeLimit;

    const books = await Book.find(filter).sort({ createdAt: -1 }).skip(skip).limit(safeLimit);
    const total = await Book.countDocuments(filter);

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Your books retrieved successfully",
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(total / safeLimit),
      books,
    });
  } catch (error) {
    logger.error("GET MY BOOKS ERROR:");
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Server error",
    });
  }
};