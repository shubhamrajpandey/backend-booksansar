import { Router } from "express";
import { sendOtp, verifyReset } from "../controllers/otp.controller";

const router = Router();

router.post("/send-otp", sendOtp);

router.post("/verify-reset", verifyReset);

export default router;
