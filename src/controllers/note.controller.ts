import { Request, Response } from "express";
import Note from "../models/note.model";

export const createNote = async (req: Request, res: Response) => {
  try {
    const { bookId, content, page } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        message: "Please login to create notes" 
      });
    }

    if (!bookId || !content) {
      return res.status(400).json({ 
        success: false, 
        message: "Book ID and content are required" 
      });
    }

    const note = await Note.create({
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
  } catch (error: any) {
    console.error("Error creating note:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create note",
      error: error.message,
    });
  }
};

export const getNotes = async (req: Request, res: Response) => {
  try {
    const { bookId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        message: "Please login to view notes" 
      });
    }

    const notes = await Note.find({ userId, bookId }).sort({ page: 1, createdAt: -1 });

    return res.status(200).json({
      success: true,
      notes,
    });
  } catch (error: any) {
    console.error("Error fetching notes:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch notes",
      error: error.message,
    });
  }
};

export const updateNote = async (req: Request, res: Response) => {
  try {
    const { noteId } = req.params;
    const { content } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        message: "Please login to update notes" 
      });
    }

    if (!content) {
      return res.status(400).json({ 
        success: false, 
        message: "Content is required" 
      });
    }

    const note = await Note.findOneAndUpdate(
      { _id: noteId, userId }, // Ensure user can only update their own notes
      { content },
      { new: true }
    );

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
  } catch (error: any) {
    console.error("Error updating note:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update note",
      error: error.message,
    });
  }
};

export const deleteNote = async (req: Request, res: Response) => {
  try {
    const { noteId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        message: "Please login to delete notes" 
      });
    }

    const note = await Note.findOneAndDelete({
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
  } catch (error: any) {
    console.error("Error deleting note:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete note",
      error: error.message,
    });
  }
};

export const getAllUserNotes = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        message: "Please login to view notes" 
      });
    }

    const notes = await Note.find({ userId })
      .populate("bookId", "title author thumbnail")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      notes,
    });
  } catch (error: any) {
    console.error("Error fetching all notes:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch notes",
      error: error.message,
    });
  }
};