import { Router } from "express";
import { trackReading } from "./readingstats.controller";
import { authenticateToken } from "../../middlewares/auth.middleware";

const router = Router();

router.post("/track", authenticateToken, trackReading);

export default router;
