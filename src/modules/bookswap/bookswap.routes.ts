import { Router } from "express";
import { authenticateToken } from "../../middlewares/auth.middleware";
import { verifyRole } from "../../middlewares/role.middleware";
import {
  createSwap,
  getAllSwaps,
  getMySwaps,
  getSingleSwap,
  updateSwap,
  deleteSwap,
  proposeSwap,
  respondToProposal,
  getAllSwapsAdmin,
} from "./bookswap.controller";

const router = Router();

router.get("/", getAllSwaps);

router.get("/:id", getSingleSwap);

router.post(
  "/",
  authenticateToken,
  verifyRole("learner", "vendor", "admin"),
  createSwap,
);

router.get(
  "/my/listings",
  authenticateToken,
  verifyRole("learner", "vendor", "admin"),
  getMySwaps,
);

router.patch(
  "/:id",
  authenticateToken,
  verifyRole("learner", "vendor", "admin"),
  updateSwap,
);

router.delete(
  "/:id",
  authenticateToken,
  verifyRole("learner", "vendor", "admin"),
  deleteSwap,
);

router.post(
  "/:id/propose",
  authenticateToken,
  verifyRole("learner", "vendor", "admin"),
  proposeSwap,
);

router.patch(
  "/:id/proposals/:proposalId",
  authenticateToken,
  verifyRole("learner", "vendor", "admin"),
  respondToProposal,
);

router.get(
  "/admin/all",
  authenticateToken,
  verifyRole("admin"),
  getAllSwapsAdmin,
);

export default router;
