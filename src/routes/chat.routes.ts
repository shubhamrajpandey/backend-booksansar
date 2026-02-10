import { Router } from "express";
import {
  createOrGetConversation,
  getMessages,
  getUserConversations,
  deleteConversation,
} from "../controllers/chat.controller";
import { authenticateToken } from "../middlewares/auth.middleware";

const router = Router();

router.post("/conversation", authenticateToken, createOrGetConversation);
router.get("/conversations", authenticateToken, getUserConversations);
router.get("/messages/:conversationId", authenticateToken, getMessages);
router.delete("/conversation/:conversationId", authenticateToken, deleteConversation);

export default router;