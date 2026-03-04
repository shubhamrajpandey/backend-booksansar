import express from "express";
import {
  addHighlight,
  getHighlights,
  deleteHighlight,
  getAllUserHighlights,
} from "./highlight.controller";
import { authenticateToken } from "../../middlewares/auth.middleware";

const router = express.Router();

router.post("/", authenticateToken, addHighlight);

router.get("/book/:bookId", authenticateToken, getHighlights);

router.get("/", authenticateToken, getAllUserHighlights);

router.delete("/:highlightId", authenticateToken, deleteHighlight);

export default router;
