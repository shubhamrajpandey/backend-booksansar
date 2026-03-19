import { Router } from "express";
import {
  getAllUsers,
  deleteUser,
  updateVendorStatus,
  getAllCategories,
  getCategoryById,
  addCategory,
  updateCategory,
  deleteCategory,
  getActiveCategories,
  moderateFreeBook,
  updateUserAccountStatus,
  getVendorDetails,
  updateAdminPassword,
  getAdminProfile,
  updateAdminProfile,
  getPlatformStats,
  getGenres,
  addGenre,
  updateGenre,
  deleteGenre,
  // Dashboard functions
  getAdminDashboardStats,
  getAdminRevenueChart,
  getAdminKYCStatus,
  getAdminOrderStatus,
} from "./admin.controller";
import { verifyRole } from "../../middlewares/role.middleware";
import { authenticateToken } from "../../middlewares/auth.middleware";
import { getPendingFreeBooks } from "./admin.controller";

const router = Router();

// ==================== USER ROUTES ====================
router.get("/users", authenticateToken, verifyRole("admin"), getAllUsers);
router.delete("/users/:id", authenticateToken, verifyRole("admin"), deleteUser);

// ==================== VENDOR ROUTES ====================
router.get(
  "/vendors/:id/details",
  authenticateToken,
  verifyRole("admin"),
  getVendorDetails,
);

router.patch(
  "/vendors/:id/status",
  authenticateToken,
  verifyRole("admin"),
  updateVendorStatus,
);

router.patch(
  "/users/:id/account-status",
  authenticateToken,
  verifyRole("admin"),
  updateUserAccountStatus,
);

// ==================== ADMIN PROFILE ROUTES ====================
router.get("/profile", authenticateToken, verifyRole("admin"), getAdminProfile);
router.put(
  "/profile",
  authenticateToken,
  verifyRole("admin"),
  updateAdminProfile,
);
router.put(
  "/password",
  authenticateToken,
  verifyRole("admin"),
  updateAdminPassword,
);

// ==================== PLATFORM STATS ROUTES ====================
router.get(
  "/platform/stats",
  authenticateToken,
  verifyRole("admin"),
  getPlatformStats,
);

// ==================== DASHBOARD ROUTES (NEW) ====================
router.get(
  "/dashboard/stats",
  authenticateToken,
  verifyRole("admin"),
  getAdminDashboardStats,
);

router.get(
  "/dashboard/revenue-chart",
  authenticateToken,
  verifyRole("admin"),
  getAdminRevenueChart,
);

router.get(
  "/dashboard/kyc-status",
  authenticateToken,
  verifyRole("admin"),
  getAdminKYCStatus,
);

router.get(
  "/dashboard/order-status",
  authenticateToken,
  verifyRole("admin"),
  getAdminOrderStatus,
);

// ==================== CATEGORY ROUTES ====================
router.get("/active", getActiveCategories);
router.get("/categories", getAllCategories);
router.get("/categories/:id", getCategoryById);
router.post("/categories", authenticateToken, verifyRole("admin"), addCategory);
router.put(
  "/categories/:id",
  authenticateToken,
  verifyRole("admin"),
  updateCategory,
);
router.delete(
  "/categories/:id",
  authenticateToken,
  verifyRole("admin"),
  deleteCategory,
);

// ==================== GENRE ROUTES ====================
router.get("/genres", getGenres);
router.post("/genres", authenticateToken, verifyRole("admin"), addGenre);
router.put("/genres/:id", authenticateToken, verifyRole("admin"), updateGenre);
router.delete(
  "/genres/:id",
  authenticateToken,
  verifyRole("admin"),
  deleteGenre,
);

// ==================== BOOK MODERATION ROUTES ====================
router.patch(
  "/books/:id/moderate",
  authenticateToken,
  verifyRole("admin"),
  moderateFreeBook,
);

router.get(
  "/books/pending",
  authenticateToken,
  verifyRole("admin"),
  getPendingFreeBooks,
);

export default router;
