import { Router } from "express";
import { getRecommendations, getTrending } from "./ai.controller";
import { authenticateToken } from "../../middlewares/auth.middleware";

const router = Router();

// Public — works for both logged-in and guest users
router.get("/recommendations", authenticateToken, getRecommendations);

// Public — always trending, no auth needed
router.get("/trending", getTrending);

export default router;
