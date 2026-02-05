import { Request, Response } from "express";
import Wishlist from "../models/wishlist.model";
import Book from "../models/book.model";

// Get user's wishlist
export const getWishlist = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    let wishlist = await Wishlist.findOne({ userId }).populate("items.bookId");

    if (!wishlist) {
      wishlist = await Wishlist.create({ userId, items: [] });
    }

    res.status(200).json({ wishlist });
  } catch (error) {
    console.error("Get wishlist error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Add item to wishlist
export const addToWishlist = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { bookId } = req.body;

    if (!bookId) {
      return res.status(400).json({ message: "Book ID is required" });
    }

    const book = await Book.findById(bookId);
    if (!book) {
      return res.status(404).json({ message: "Book not found" });
    }

    let wishlist = await Wishlist.findOne({ userId });

    if (!wishlist) {
      wishlist = await Wishlist.create({ userId, items: [] });
    }

    const existingItem = wishlist.items.find(
      (item) => item.bookId.toString() === bookId
    );

    if (existingItem) {
      return res.status(400).json({ message: "Book already in wishlist" });
    }

    wishlist.items.push({
      bookId,
      addedAt: new Date(),
    });

    await wishlist.save();

    wishlist = await Wishlist.findById(wishlist._id).populate("items.bookId");

    res.status(200).json({
      message: "Item added to wishlist",
      wishlist,
    });
  } catch (error) {
    console.error("Add to wishlist error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

//Remove item from wishlist
export const removeFromWishlist = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { bookId } = req.params;

    const wishlist = await Wishlist.findOne({ userId });

    if (!wishlist) {
      return res.status(404).json({ message: "Wishlist not found" });
    }

    wishlist.items = wishlist.items.filter(
      (item) => item.bookId.toString() !== bookId
    );

    await wishlist.save();

    const updatedWishlist = await Wishlist.findById(wishlist._id).populate(
      "items.bookId"
    );

    res.status(200).json({
      message: "Item removed from wishlist",
      wishlist: updatedWishlist,
    });
  } catch (error) {
    console.error("Remove from wishlist error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Clear entire wishlist
export const clearWishlist = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    const wishlist = await Wishlist.findOne({ userId });

    if (!wishlist) {
      return res.status(404).json({ message: "Wishlist not found" });
    }

    wishlist.items = [];
    await wishlist.save();

    res.status(200).json({
      message: "Wishlist cleared",
      wishlist,
    });
  } catch (error) {
    console.error("Clear wishlist error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

//  Check if book is in wishlist
export const checkWishlist = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { bookId } = req.params;

    const wishlist = await Wishlist.findOne({ userId });

    if (!wishlist) {
      return res.status(200).json({ inWishlist: false });
    }

    const exists = wishlist.items.some(
      (item) => item.bookId.toString() === bookId
    );

    res.status(200).json({ inWishlist: exists });
  } catch (error) {
    console.error("Check wishlist error:", error);
    res.status(500).json({ message: "Server error" });
  }
};