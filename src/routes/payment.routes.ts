import { Router } from "express";
import {
  initiateEsewaPayment,
  verifyEsewaPaymentCallback,
} from "../controllers/payment.controller";
import { authenticateToken } from "../middlewares/auth.middleware";

const router = Router();

router.post("/esewa/initiate", authenticateToken, initiateEsewaPayment);

router.get("/esewa/verify", verifyEsewaPaymentCallback);

export default router;
