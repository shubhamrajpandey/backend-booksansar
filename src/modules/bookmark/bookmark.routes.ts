import express from "express";
import {
  toggleBookmark,
  getUserBookmarks,
  checkBookmark,
} from "./bookmark.controller";
import { authenticateToken } from "../../middlewares/auth.middleware";

const router = express.Router();

router.post("/toggle", authenticateToken, toggleBookmark);

router.get("/", authenticateToken, getUserBookmarks);

router.get("/check/:bookId", authenticateToken, checkBookmark);

export default router;
