// src/routes/payment.routes.ts
import { Router } from "express";
import {
  initiateEsewaPayment,
  verifyEsewaPayment,
} from "../controllers/payment.controller";

const router = Router();

router.post("/esewa/initiate", initiateEsewaPayment);
router.get("/esewa/verify", verifyEsewaPayment);

export default router;