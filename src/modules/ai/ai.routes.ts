import { Router } from "express";
import { getRecommendations, getTrending, aiChat, smartSearch } from "./ai.controller";
import { authenticateToken } from "../../middlewares/auth.middleware";

const router = Router();
const optionalAuth = (req: any, res: any, next: any) => {
    const authHeader = req.headers["authorization"];
    if (authHeader) {
        return authenticateToken(req, res, next);
    }
    next();
};

router.get("/recommendations", authenticateToken, getRecommendations);
router.get("/trending", getTrending);
router.post("/chat", optionalAuth, aiChat);
router.get("/search", smartSearch);

export default router;