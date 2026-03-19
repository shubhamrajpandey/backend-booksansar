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
  getAdminDashboardStats,
  getAdminRevenueChart,
  getAdminKYCStatus,
  getAdminOrderStatus,
  getAdminSalesTrend,
  getAdminTopVendors,
  getAdminTopBooks,
  getAdminPlatformSummary,
  getAdminCategoryPerformance,
  getAdminUserGrowth,
} from "./admin.controller";
import { verifyRole } from "../../middlewares/role.middleware";
import { authenticateToken } from "../../middlewares/auth.middleware";
import { getPendingFreeBooks } from "./admin.controller";

const router = Router();

router.get("/users", authenticateToken, verifyRole("admin"), getAllUsers);
router.delete("/users/:id", authenticateToken, verifyRole("admin"), deleteUser);

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

router.get(
  "/platform/stats",
  authenticateToken,
  verifyRole("admin"),
  getPlatformStats,
);

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

router.get("/genres", getGenres);
router.post("/genres", authenticateToken, verifyRole("admin"), addGenre);
router.put("/genres/:id", authenticateToken, verifyRole("admin"), updateGenre);
router.delete(
  "/genres/:id",
  authenticateToken,
  verifyRole("admin"),
  deleteGenre,
);

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

router.get(
  "/reports/sales-trend",
  authenticateToken,
  verifyRole("admin"),
  getAdminSalesTrend,
);
router.get(
  "/reports/top-vendors",
  authenticateToken,
  verifyRole("admin"),
  getAdminTopVendors,
);
router.get(
  "/reports/top-books",
  authenticateToken,
  verifyRole("admin"),
  getAdminTopBooks,
);
router.get(
  "/reports/platform-summary",
  authenticateToken,
  verifyRole("admin"),
  getAdminPlatformSummary,
);
router.get(
  "/reports/category-performance",
  authenticateToken,
  verifyRole("admin"),
  getAdminCategoryPerformance,
);
router.get(
  "/reports/user-growth",
  authenticateToken,
  verifyRole("admin"),
  getAdminUserGrowth,
);

export default router;
