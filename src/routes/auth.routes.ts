import { Router } from "express";
import { userRegister, userLogin, vendorRegistration } from "../controllers/auth.controller";

const router = Router();

router.post("/register", userRegister);
router.post("/login", userLogin);
router.post("/vendor-register", vendorRegistration);

export default router;