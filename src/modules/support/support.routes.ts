import { Router } from "express";
import {
  createSupportRequest,
  getAllSupportRequests,
  updateSupportRequest,
  deleteSupportRequest,
} from "./support.controller";
import { authenticateToken } from "../../middlewares/auth.middleware";
import { verifyRole } from "../../middlewares/role.middleware";

const router = Router();

router.post("/", createSupportRequest);

router.get("/", authenticateToken, verifyRole("admin"), getAllSupportRequests);
router.patch(
  "/:id",
  authenticateToken,
  verifyRole("admin"),
  updateSupportRequest,
);
router.delete(
  "/:id",
  authenticateToken,
  verifyRole("admin"),
  deleteSupportRequest,
);

export default router;
