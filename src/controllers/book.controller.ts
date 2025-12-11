import { StatusCodes } from "http-status-codes";
import { Response, Request } from "express";
import Book from "../models/book.model";

export const uploadBookDetails = async (req: Request, res: Response) => {
  try {
    const {
      type,
      title,
      author,
      category,
      description,
      coverImage,
      additionalImages,
      pdfUrl,
      price,
      mrp,
      stock,
      condition,
      deliveryInfo,
      language,
      edition,
      negotiable,
      sellerName,
      phone,
      location,
      printedPrice,
      bookType
    } = req.body;

    const uploader = req.user?.id;
    const role = req.user?.role;

    if (!uploader) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (!type || !title || !author || !category) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "Missing required fields",
      });
    }

    if (type === "physical" && role !== "vendor") {
      return res.status(StatusCodes.FORBIDDEN).json({
        success: false,
        message: "Only vendors can upload physical books",
      });
    }

    if (type === "second-hand" && role !== "learner") {
      return res.status(StatusCodes.FORBIDDEN).json({
        success: false,
        message: "Only learners can upload second-hand books",
      });
    }

    if (type === "free" && !pdfUrl) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "Free books must include a PDF URL",
      });
    }

    if (type === "physical") {
      if (!price || !stock || !deliveryInfo) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Physical books require price, stock, and delivery info",
        });
      }
    }

    if (type === "second-hand") {
      if (!price || !condition) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Second-hand books require price and condition",
        });
      }

      const validConditions = ["new", "used-good", "used-ok"];
      if (!validConditions.includes(condition)) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Invalid condition. Allowed: new, used-good, used-ok",
        });
      }
    }

    const book = await Book.create({
      type,
      title,
      author,
      category,
      description,
      coverImage,
      additionalImages,
      pdfUrl,
      price,
      mrp,
      stock,
      condition,
      deliveryInfo,
      visibility: "pending",

      language,
      edition,
      negotiable,
      sellerName,
      phone,
      location,

      uploader,
      printedPrice,
      bookType
    });

    return res.status(StatusCodes.CREATED).json({
      success: true,
      message: "Book uploaded successfully",
      book,
    });
  } catch (error) {
    console.error(error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Server error",
    });
  }
};

export const getAllBooks = async (req: Request, res: Response) => {
  try {
    const book = await Book.find().populate("uploader", "name email role");

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Book retrived successfully",
      book,
    });
  } catch (error) {
    console.error("");
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Server error",
      error,
    });
  }
};

export const getSingleBook = async (req: Request, res: Response) => {
  try {
    const book = await Book.findById(req.params.id).populate(
      "uploader",
      "name email role"
    );

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Books retrieved successfully",
      book,
    });
  } catch (error) {
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: "Server error" });
  }
};

export const updateBookDetails = async (req: Request, res: Response) => {
  try {
    const book = await Book.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Book updated successfully",
      book,
    });
  } catch (error) {
    console.error();
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: "Server error" });
  }
};

export const deleteBookDetails = async (req: Request, res: Response) => {
  try {
    const book = await Book.findByIdAndDelete(req.params.id);
    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Book deleted successfully"
    })
  } catch (error) {
    console.error();
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Server error",
    });
  }
};
