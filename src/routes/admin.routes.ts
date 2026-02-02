import { Router } from "express";
import { getAllUsers, deleteUser, updateVendorStatus, getAllCategories,
  getCategoryById,
  addCategory,
  updateCategory,
  deleteCategory,
  getActiveCategories, moderateFreeBook, 
  updateUserAccountStatus,
  getVendorDetails} from "../controllers/admin.controller";
import { verifyRole } from "../middlewares/role.middleware";
import { authenticateToken } from "../middlewares/auth.middleware";
import { getPendingFreeBooks } from "../controllers/admin.controller";
import { get } from "http";

const router = Router();

//get all users and filter by role or search
router.get("/users", authenticateToken, verifyRole("admin"), getAllUsers);
router.delete("/users/:id", authenticateToken, verifyRole("admin"), deleteUser);

router.get("/vendors/:id/details", authenticateToken, verifyRole("admin"), getVendorDetails);

router.patch(
  "/vendors/:id/status",
  authenticateToken,
  verifyRole("admin"),
  updateVendorStatus
);

router.patch(
  "/users/:id/account-status",
  authenticateToken,
  verifyRole("admin"),
  updateUserAccountStatus
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

router.get("/books/pending",authenticateToken,verifyRole("admin"),getPendingFreeBooks);

export default router;
    