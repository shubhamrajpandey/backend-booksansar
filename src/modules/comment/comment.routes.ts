import { Router } from "express";
import { getComments, addComment, deleteComment } from "./comment.controller";
import { authenticateToken } from "../../middlewares/auth.middleware";

const router = Router();

router.get("/:bookId", getComments);

router.post("/", authenticateToken, addComment);
router.delete("/:commentId", authenticateToken, deleteComment);

export default router;