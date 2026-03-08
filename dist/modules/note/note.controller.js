"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllUserNotes = exports.deleteNote = exports.updateNote = exports.getNotes = exports.createNote = void 0;
const note_model_1 = __importDefault(require("./note.model"));
const createNote = async (req, res) => {
    try {
        const { bookId, content, page } = req.body;
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Please login to create notes",
            });
        }
        if (!bookId || !content) {
            return res.status(400).json({
                success: false,
                message: "Book ID and content are required",
            });
        }
        const note = await note_model_1.default.create({
            userId,
            bookId,
            content,
            page: page || null,
        });
        return res.status(201).json({
            success: true,
            message: "Note created successfully",
            note,
        });
    }
    catch (error) {
        console.error("Error creating note:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to create note",
            error: error.message,
        });
    }
};
exports.createNote = createNote;
const getNotes = async (req, res) => {
    try {
        const { bookId } = req.params;
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Please login to view notes",
            });
        }
        const notes = await note_model_1.default.find({ userId, bookId }).sort({
            page: 1,
            createdAt: -1,
        });
        return res.status(200).json({
            success: true,
            notes,
        });
    }
    catch (error) {
        console.error("Error fetching notes:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch notes",
            error: error.message,
        });
    }
};
exports.getNotes = getNotes;
const updateNote = async (req, res) => {
    try {
        const { noteId } = req.params;
        const { content } = req.body;
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Please login to update notes",
            });
        }
        if (!content) {
            return res.status(400).json({
                success: false,
                message: "Content is required",
            });
        }
        const note = await note_model_1.default.findOneAndUpdate({ _id: noteId, userId }, // Ensure user can only update their own notes
        { content }, { new: true });
        if (!note) {
            return res.status(404).json({
                success: false,
                message: "Note not found",
            });
        }
        return res.status(200).json({
            success: true,
            message: "Note updated successfully",
            note,
        });
    }
    catch (error) {
        console.error("Error updating note:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to update note",
            error: error.message,
        });
    }
};
exports.updateNote = updateNote;
const deleteNote = async (req, res) => {
    try {
        const { noteId } = req.params;
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Please login to delete notes",
            });
        }
        const note = await note_model_1.default.findOneAndDelete({
            _id: noteId,
            userId, // Ensure user can only delete their own notes
        });
        if (!note) {
            return res.status(404).json({
                success: false,
                message: "Note not found",
            });
        }
        return res.status(200).json({
            success: true,
            message: "Note deleted successfully",
        });
    }
    catch (error) {
        console.error("Error deleting note:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to delete note",
            error: error.message,
        });
    }
};
exports.deleteNote = deleteNote;
const getAllUserNotes = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Please login to view notes",
            });
        }
        const notes = await note_model_1.default.find({ userId })
            .populate("bookId", "title author thumbnail")
            .sort({ createdAt: -1 });
        return res.status(200).json({
            success: true,
            notes,
        });
    }
    catch (error) {
        console.error("Error fetching all notes:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch notes",
            error: error.message,
        });
    }
};
exports.getAllUserNotes = getAllUserNotes;
