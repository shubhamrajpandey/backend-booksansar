import { Router } from "express";
import {
    getRecommendations,
    getTrending,
    aiChat,
    smartSearch,
} from "./ai.controller";
import { authenticateToken } from "../../middlewares/auth.middleware";

const router = Router();

router.get("/recommendations", authenticateToken, getRecommendations);
router.get("/trending", getTrending);
router.post("/chat", aiChat);
router.get("/search", smartSearch);

export default router;