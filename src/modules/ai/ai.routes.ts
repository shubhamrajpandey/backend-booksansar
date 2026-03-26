import { Router } from "express";
import { getRecommendations, getTrending } from "./ai.controller";
import { authenticateToken } from "../../middlewares/auth.middleware";

const router = Router();

router.get("/recommendations", authenticateToken, getRecommendations);

router.get("/trending", getTrending);

export default router;
