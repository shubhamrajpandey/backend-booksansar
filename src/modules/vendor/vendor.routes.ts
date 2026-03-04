import { Router } from "express";
import {
  getVendorProfile,
  updateVendorProfile,
  updateVendorPassword,
  getVendorBilling,
} from "./vendor.controller";
import { authenticateToken } from "../../middlewares/auth.middleware";

const router = Router();

router.use(authenticateToken);

router.get("/profile", getVendorProfile);
router.patch("/profile", updateVendorProfile);
router.patch("/password", updateVendorPassword);
router.get("/billing", getVendorBilling);

export default router;
