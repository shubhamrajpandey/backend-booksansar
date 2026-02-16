import { Request, Response } from "express";
import Bookmark from "../models/bookmark.model";

export const toggleBookmark = async (req: Request, res: Response) => {
  try {
    const { bookId } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        message: "Please login to bookmark books" 
      });
    }

    if (!bookId) {
      return res.status(400).json({ 
        success: false, 
        message: "Book ID is required" 
      });
    }

    // Check if bookmark exists
    const existingBookmark = await Bookmark.findOne({ userId, bookId });

    if (existingBookmark) {
      // Remove bookmark
      await Bookmark.findByIdAndDelete(existingBookmark._id);
      return res.status(200).json({
        success: true,
        message: "Bookmark removed",
        isBookmarked: false,
      });
    } else {
      // Add bookmark
      const newBookmark = await Bookmark.create({ userId, bookId });
      return res.status(201).json({
        success: true,
        message: "Book bookmarked",
        isBookmarked: true,
        bookmark: newBookmark,
      });
    }
  } catch (error: any) {
    console.error("Error toggling bookmark:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to toggle bookmark",
      error: error.message,
    });
  }
};

export const getUserBookmarks = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        message: "Please login to view bookmarks" 
      });
    }

    const bookmarks = await Bookmark.find({ userId })
      .populate("bookId", "title author thumbnail pdfUrl price")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      bookmarks,
    });
  } catch (error: any) {
    console.error("Error fetching bookmarks:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch bookmarks",
      error: error.message,
    });
  }
};

export const checkBookmark = async (req: Request, res: Response) => {
  try {
    const { bookId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(200).json({ 
        success: true, 
        isBookmarked: false 
      });
    }

    const bookmark = await Bookmark.findOne({ userId, bookId });

    return res.status(200).json({
      success: true,
      isBookmarked: !!bookmark,
    });
  } catch (error: any) {
    console.error("Error checking bookmark:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to check bookmark status",
      error: error.message,
    });
  }
};