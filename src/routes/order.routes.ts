// routes/order.routes.ts
import { Router } from "express";
import { createOrder } from "../controllers/order.controller";
import { authenticateToken } from "../middlewares/auth.middleware";

const router = Router();

router.post("/", authenticateToken, createOrder);

export default router;