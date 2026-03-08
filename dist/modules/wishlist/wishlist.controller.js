"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkWishlist = exports.clearWishlist = exports.removeFromWishlist = exports.addToWishlist = exports.getWishlist = void 0;
const wishlist_model_1 = __importDefault(require("./wishlist.model"));
const book_model_1 = __importDefault(require("../book/book.model"));
const logger_1 = __importDefault(require("../../utils/logger"));
const BOOK_FIELDS = "title author coverImage additionalImages price";
// Get user's wishlist
const getWishlist = async (req, res) => {
    try {
        const userId = req.user?.id;
        let wishlist = await wishlist_model_1.default.findOne({ userId }).populate("items.bookId", BOOK_FIELDS);
        if (!wishlist) {
            wishlist = await wishlist_model_1.default.create({ userId, items: [] });
        }
        res.status(200).json({ wishlist });
    }
    catch (error) {
        logger_1.default.error("Get wishlist error:");
        res.status(500).json({ message: "Server error" });
    }
};
exports.getWishlist = getWishlist;
// Add item to wishlist
const addToWishlist = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { bookId } = req.body;
        if (!bookId) {
            return res.status(400).json({ message: "Book ID is required" });
        }
        const book = await book_model_1.default.findById(bookId);
        if (!book) {
            return res.status(404).json({ message: "Book not found" });
        }
        let wishlist = await wishlist_model_1.default.findOne({ userId });
        if (!wishlist) {
            wishlist = await wishlist_model_1.default.create({ userId, items: [] });
        }
        const existingItem = wishlist.items.find((item) => item.bookId.toString() === bookId);
        if (existingItem) {
            return res.status(400).json({ message: "Book already in wishlist" });
        }
        wishlist.items.push({ bookId, addedAt: new Date() });
        await wishlist.save();
        wishlist = await wishlist_model_1.default.findById(wishlist._id).populate("items.bookId", BOOK_FIELDS);
        res.status(200).json({ message: "Item added to wishlist", wishlist });
    }
    catch (error) {
        logger_1.default.error("Add to wishlist error:");
        res.status(500).json({ message: "Server error" });
    }
};
exports.addToWishlist = addToWishlist;
// Remove item from wishlist
const removeFromWishlist = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { bookId } = req.params;
        const wishlist = await wishlist_model_1.default.findOne({ userId });
        if (!wishlist) {
            return res.status(404).json({ message: "Wishlist not found" });
        }
        wishlist.items = wishlist.items.filter((item) => item.bookId.toString() !== bookId);
        await wishlist.save();
        const updatedWishlist = await wishlist_model_1.default.findById(wishlist._id).populate("items.bookId", BOOK_FIELDS);
        res.status(200).json({
            message: "Item removed from wishlist",
            wishlist: updatedWishlist,
        });
    }
    catch (error) {
        logger_1.default.error("Remove from wishlist error:");
        res.status(500).json({ message: "Server error" });
    }
};
exports.removeFromWishlist = removeFromWishlist;
// Clear entire wishlist
const clearWishlist = async (req, res) => {
    try {
        const userId = req.user?.id;
        const wishlist = await wishlist_model_1.default.findOne({ userId });
        if (!wishlist) {
            return res.status(404).json({ message: "Wishlist not found" });
        }
        wishlist.items = [];
        await wishlist.save();
        res.status(200).json({ message: "Wishlist cleared", wishlist });
    }
    catch (error) {
        logger_1.default.error("Clear wishlist error:");
        res.status(500).json({ message: "Server error" });
    }
};
exports.clearWishlist = clearWishlist;
// Check if book is in wishlist
const checkWishlist = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { bookId } = req.params;
        const wishlist = await wishlist_model_1.default.findOne({ userId });
        if (!wishlist) {
            return res.status(200).json({ inWishlist: false });
        }
        const exists = wishlist.items.some((item) => item.bookId.toString() === bookId);
        res.status(200).json({ inWishlist: exists });
    }
    catch (error) {
        logger_1.default.error("Check wishlist error:");
        res.status(500).json({ message: "Server error" });
    }
};
exports.checkWishlist = checkWishlist;
