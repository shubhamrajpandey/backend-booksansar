"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkBookmark = exports.getUserBookmarks = exports.toggleBookmark = void 0;
const bookmark_model_1 = __importDefault(require("./bookmark.model"));
const toggleBookmark = async (req, res) => {
    try {
        const { bookId } = req.body;
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Please login to bookmark books",
            });
        }
        if (!bookId) {
            return res.status(400).json({
                success: false,
                message: "Book ID is required",
            });
        }
        const existingBookmark = await bookmark_model_1.default.findOne({ userId, bookId });
        if (existingBookmark) {
            await bookmark_model_1.default.findByIdAndDelete(existingBookmark._id);
            return res.status(200).json({
                success: true,
                message: "Bookmark removed",
                isBookmarked: false,
            });
        }
        else {
            const newBookmark = await bookmark_model_1.default.create({ userId, bookId });
            return res.status(201).json({
                success: true,
                message: "Book bookmarked",
                isBookmarked: true,
                bookmark: newBookmark,
            });
        }
    }
    catch (error) {
        console.error("Error toggling bookmark:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to toggle bookmark",
            error: error.message,
        });
    }
};
exports.toggleBookmark = toggleBookmark;
const getUserBookmarks = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Please login to view bookmarks",
            });
        }
        const bookmarks = await bookmark_model_1.default.find({ userId })
            .populate("bookId", "title author coverImage additionalImages thumbnail pdfUrl price") // ✅ added coverImage + additionalImages
            .sort({ createdAt: -1 });
        return res.status(200).json({
            success: true,
            bookmarks,
        });
    }
    catch (error) {
        console.error("Error fetching bookmarks:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch bookmarks",
            error: error.message,
        });
    }
};
exports.getUserBookmarks = getUserBookmarks;
const checkBookmark = async (req, res) => {
    try {
        const { bookId } = req.params;
        const userId = req.user?.id;
        if (!userId) {
            return res.status(200).json({
                success: true,
                isBookmarked: false,
            });
        }
        const bookmark = await bookmark_model_1.default.findOne({ userId, bookId });
        return res.status(200).json({
            success: true,
            isBookmarked: !!bookmark,
        });
    }
    catch (error) {
        console.error("Error checking bookmark:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to check bookmark status",
            error: error.message,
        });
    }
};
exports.checkBookmark = checkBookmark;
