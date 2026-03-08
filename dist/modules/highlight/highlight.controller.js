"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllUserHighlights = exports.deleteHighlight = exports.getHighlights = exports.addHighlight = void 0;
const highlight_model_1 = __importDefault(require("./highlight.model"));
const addHighlight = async (req, res) => {
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
        const highlight = await highlight_model_1.default.create({
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
    }
    catch (error) {
        console.error("Error adding highlight:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to add highlight",
            error: error.message,
        });
    }
};
exports.addHighlight = addHighlight;
const getHighlights = async (req, res) => {
    try {
        const { bookId } = req.params;
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Please login to view highlights",
            });
        }
        const highlights = await highlight_model_1.default.find({ userId, bookId }).sort({
            page: 1,
            createdAt: 1,
        });
        return res.status(200).json({
            success: true,
            highlights,
        });
    }
    catch (error) {
        console.error("Error fetching highlights:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch highlights",
            error: error.message,
        });
    }
};
exports.getHighlights = getHighlights;
const deleteHighlight = async (req, res) => {
    try {
        const { highlightId } = req.params;
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Please login to delete highlights",
            });
        }
        const highlight = await highlight_model_1.default.findOneAndDelete({
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
    }
    catch (error) {
        console.error("Error deleting highlight:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to delete highlight",
            error: error.message,
        });
    }
};
exports.deleteHighlight = deleteHighlight;
const getAllUserHighlights = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Please login to view highlights",
            });
        }
        const highlights = await highlight_model_1.default.find({ userId })
            .populate("bookId", "title author thumbnail")
            .sort({ createdAt: -1 });
        return res.status(200).json({
            success: true,
            highlights,
        });
    }
    catch (error) {
        console.error("Error fetching all highlights:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch highlights",
            error: error.message,
        });
    }
};
exports.getAllUserHighlights = getAllUserHighlights;
