import { Router } from "express";
import { getAllUsers, deleteUser, updateVendorStatus } from "../controllers/admin.controller";
import { verifyRole } from "../middlewares/role.middleware";
import { authenticateToken } from "../middlewares/auth.middleware";

const router = Router();

//get all users and filter by role or search
router.get("/users", authenticateToken, verifyRole("admin"), getAllUsers);
router.delete("/users/:id", authenticateToken, verifyRole("admin"), deleteUser);

router.patch(
  "/vendors/:id/status",
  authenticateToken,
  verifyRole("admin"),
  updateVendorStatus
);


export default router;
    