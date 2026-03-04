import express from "express";
import {
  createNote,
  getNotes,
  updateNote,
  deleteNote,
  getAllUserNotes,
} from "./note.controller";
import { authenticateToken } from "../../middlewares/auth.middleware";

const router = express.Router();

router.post("/", authenticateToken, createNote);

router.get("/:bookId", authenticateToken, getNotes);

router.get("/", authenticateToken, getAllUserNotes);

router.put("/:noteId", authenticateToken, updateNote);

router.delete("/:noteId", authenticateToken, deleteNote);

export default router;
