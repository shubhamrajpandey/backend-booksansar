import { Router } from "express";
import {
  userRegister,
  userLogin,
  vendorRegistration,
  changePassword,
  verifyEmail,
} from "./auth.controller";
import { authenticateToken } from "../../middlewares/auth.middleware";

const router = Router();

router.post("/register", userRegister);
router.post("/verify-email", verifyEmail);
router.post("/login", userLogin);
router.post("/vendor-register", vendorRegistration);
router.patch("/change-password", authenticateToken, changePassword);

export default router;
