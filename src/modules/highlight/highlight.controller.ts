import { Request, Response } from "express";
import Highlight from "./highlight.model";

export const addHighlight = async (req: Request, res: Response) => {
  try {
    const { bookId, page, text, color } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Please login to highlight text",
      });
    }

    if (!bookId || !page || !text) {
      return res.status(400).json({
        success: false,
        message: "Book ID, page, and text are required",
      });
    }

    const highlight = await Highlight.create({
      userId,
      bookId,
      page,
      text,
      color: color || "#FFEB3B",
    });

    return res.status(201).json({
      success: true,
      message: "Text highlighted successfully",
      highlight,
    });
  } catch (error: any) {
    console.error("Error adding highlight:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to add highlight",
      error: error.message,
    });
  }
};

export const getHighlights = async (req: Request, res: Response) => {
  try {
    const { bookId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Please login to view highlights",
      });
    }

    const highlights = await Highlight.find({ userId, bookId }).sort({
      page: 1,
      createdAt: 1,
    });

    return res.status(200).json({
      success: true,
      highlights,
    });
  } catch (error: any) {
    console.error("Error fetching highlights:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch highlights",
      error: error.message,
    });
  }
};

export const deleteHighlight = async (req: Request, res: Response) => {
  try {
    const { highlightId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Please login to delete highlights",
      });
    }

    const highlight = await Highlight.findOneAndDelete({
      _id: highlightId,
      userId, // Ensure user can only delete their own highlights
    });

    if (!highlight) {
      return res.status(404).json({
        success: false,
        message: "Highlight not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Highlight deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting highlight:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete highlight",
      error: error.message,
    });
  }
};

export const getAllUserHighlights = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Please login to view highlights",
      });
    }

    const highlights = await Highlight.find({ userId })
      .populate("bookId", "title author thumbnail")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      highlights,
    });
  } catch (error: any) {
    console.error("Error fetching all highlights:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch highlights",
      error: error.message,
    });
  }
};
