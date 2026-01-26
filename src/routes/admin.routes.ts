import { Router } from "express";
import { getAllUsers, deleteUser } from "../controllers/admin.controller";
import { verifyRole } from "../middlewares/role.middleware";
import { authenticateToken } from "../middlewares/auth.middleware";

const router = Router();

router.get("/users", authenticateToken, verifyRole("admin"), getAllUsers);
router.delete("/users/:id", authenticateToken, verifyRole("admin"), deleteUser);

export default router;
    