import { Router } from "express";
import {
  getVendorInventory,
  updateVendorBook,
  deleteVendorBook,
} from "./vendor.inventory.controller";
import { authenticateToken } from "../../middlewares/auth.middleware";
import { verifyRole } from "../../middlewares/role.middleware";

const router = Router();

router.use(authenticateToken);
router.use(verifyRole("vendor"));

router.get("/", getVendorInventory);
router.patch("/:id", updateVendorBook);
router.delete("/:id", deleteVendorBook);

export default router;
