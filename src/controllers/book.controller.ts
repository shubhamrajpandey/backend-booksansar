import { StatusCodes } from "http-status-codes";
import { Request, Response } from "express";
import Book from "../models/book.model";


export const uploadBookDetails = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        message: "Authentication required",
      });
    }

    const {
      type,
      title,
      author,
      category,
      genre,
      description,
      coverImage,
      additionalImages,
      pdfUrl,
      price,
      mrp,
      stock,
      condition,
      deliveryInfo,
      rating,
      language,
      edition,
      negotiable,
      sellerName,
      phone,
      location,
      printedPrice,
      bookType,
    } = req.body;

    const uploader = req.user.id;
    const role = req.user.role;

    if (!type || !title || !author || !category) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "type, title, author, and category are required",
      });
    }

    if (!["free", "physical", "second-hand"].includes(type)) {
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

    if (type === "free") {
      if (!pdfUrl) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Free books must include a PDF URL",
        });
      }
    }

    if (type === "physical") {
      if (
        price === undefined ||
        stock === undefined ||
        !deliveryInfo
      ) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message:
            "Physical books require price, stock, and delivery information",
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
          message:
            "Second-hand books require price and condition",
        });
      }

      if (!["new", "used-good", "used-ok"].includes(condition)) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Invalid condition value",
        });
      }
    }

    let visibility: "public" | "pending";

    if (role === "admin") {
      visibility = "public";
    } else {
      if (type === "free") {
        visibility = "pending";
      } else if (type === "physical") {
        visibility = "public";
      } else {
        visibility = "pending";
      }
    }

    const book = await Book.create({
      type,
      title: title.trim(),
      author: author.trim(),
      category,
      genre,
      description,
      coverImage,
      additionalImages,
      pdfUrl,
      price,
      mrp,
      stock,
      condition,
      deliveryInfo,
      rating,
      language,
      edition,
      negotiable,
      sellerName,
      phone,
      location,
      printedPrice,
      bookType,
      uploader,
      visibility,
    });

    return res.status(StatusCodes.CREATED).json({
      success: true,
      message:
        visibility === "pending"
          ? "Book uploaded and sent for approval"
          : "Book uploaded successfully",
      book,
    });
  } catch (error: any) {
    console.error("UPLOAD BOOK ERROR:", error);

    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Failed to upload book",
    });
  }
};


export const getAllBooks = async (req: Request, res: Response) => {
  try {
    const {
      search,
      type,
      category,
      genre,
      location,
      author,
      minPrice,
      maxPrice,
      availability,
      visibility,
      page = 1,
      limit = 10,
    } = req.query;

    const filter: any = {};

    if (req.user?.role === "admin" && visibility) {
      filter.visibility = visibility;
    } else {
      filter.visibility = "public";
    }

    if (type && typeof type === "string") {
      filter.type = type;
    }

    if (availability === "in-stock") {
      filter.stock = { $gt: 0 };
    }

    if (availability === "out-of-stock") {
      filter.stock = { $lte: 0 };
    }

    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    if (category && typeof category === "string") {
      filter.category = { $in: category.split(",") };
    }

    if(genre && typeof genre === "string"){
      filter.genre = { $in: genre.split(",") };
    }
    
    if (location && typeof location === "string") {
      filter.location = location;
    }

    if (author && typeof author === "string") {
      filter.author = { $regex: author, $options: "i" };
    }

    if (search && typeof search === "string") {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { author: { $regex: search, $options: "i" } },
      ];
    }

    const safePage = Number(page) > 0 ? Number(page) : 1;
    const safeLimit =
      Number(limit) > 0 && Number(limit) <= 100 ? Number(limit) : 10;

    const skip = (safePage - 1) * safeLimit;

    const books = await Book.find(filter)
      .populate("uploader", "name email role")
      .sort({ createdAt: -1 })
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

    if (req.user?.role !== "admin") {
      filter.visibility = "public";
    }

    const book = await Book.findOne(filter).populate(
      "uploader",
      "name email role"
    );

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
      "title",
      "author",
      "category",
      "description",
      "price",
      "stock",
      "condition",
      "location",
      "language",
      "edition",
      "negotiable",
    ];

    const updates: any = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    const book = await Book.findById(req.params.id);

    if (!book) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: "Book not found",
      });
    }

    if (
      req.user?.role !== "admin" &&
      book.uploader.toString() !== req.user?.id
    ) {
      return res.status(StatusCodes.FORBIDDEN).json({
        success: false,
        message: "Not allowed",
      });
    }

    const updatedBook = await Book.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );

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
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: "Book not found",
      });
    }

    if (
      req.user?.role !== "admin" &&
      book.uploader.toString() !== req.user?.id
    ) {
      return res.status(StatusCodes.FORBIDDEN).json({
        success: false,
        message: "Not allowed",
      });
    }

    await book.deleteOne();

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Book deleted successfully",
    });
  } catch (error) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Server error",
    });
  }
};
  