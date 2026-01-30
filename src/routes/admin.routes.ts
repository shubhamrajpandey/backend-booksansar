import { Router } from "express";
import { getAllUsers, deleteUser, updateVendorStatus, getAllCategories,
  getCategoryById,
  addCategory,
  updateCategory,
  deleteCategory,
  getActiveCategories, moderateFreeBook } from "../controllers/admin.controller";
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

router.get("/active", getActiveCategories);

router.get("/", getAllCategories);
router.get("/:id", getCategoryById);
router.post("/", addCategory);
router.put("/:id", updateCategory);
router.delete("/:id", deleteCategory);

router.patch(
  "/books/:id/moderate",
  authenticateToken,
  verifyRole("admin"),
  moderateFreeBook
);

export default router;
    