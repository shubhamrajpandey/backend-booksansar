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
      pdfUrl,    
      price,
      stock,
      condition,
      deliveryInfo,
    } = req.body;

    const uploader = req.user?.id;

    if (!uploader) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        message: "Unauthorized",
      });
    }


    if (!type || !title || !author || !category) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: "Missing required fields",
      });
    }


    if (type === "free") {
      if (!pdfUrl) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          message: "Free books must include a PDF URL",
        });
      }
    }

    if (type === "physical") {
      if (!price || !stock) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          message: "Physical books require price and stock",
        });
      }
    }

    if (type === "second-hand") {
      if (!price || !condition) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          message: "Second-hand books require price and condition",
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
      pdfUrl,
      price,
      stock,
      condition,
      deliveryInfo,
      visibility: "pending",
      uploader,
    });

    return res.status(StatusCodes.CREATED).json({
      success: true,
      message: "Book uploaded successfully",
      book,
    });
  } catch (error) {
    console.error("UPLOAD BOOK ERROR:", error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: "Server error",
    });
  }
};


export const getBookDetails = async (req: Request, res: Response) => {
  try {
    const book = await Book.find().populate("uploader", "name,email,role");

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Book retrived successfully",
      book,
    });
  } catch (error) {
    console.error("");
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: "Server error",
      error,
    });
  }
};
