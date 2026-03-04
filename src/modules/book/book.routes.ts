import { Router } from "express";
import { authenticateToken } from "../../middlewares/auth.middleware";
import { verifyRole } from "../../middlewares/role.middleware";
import {
  uploadBookDetails,
  getAllBooks,
  getSingleBook,
  updateBookDetails,
  deleteBookDetails,
} from "./book.controller";

const router = Router();

router.post(
  "/",
  authenticateToken,
  verifyRole("vendor", "learner", "admin"),
  uploadBookDetails,
);

router.get("/", getAllBooks);

router.get("/:id", getSingleBook);

router.patch(
  "/:id",
  authenticateToken,
  verifyRole("vendor", "learner", "admin"),
  updateBookDetails,
);

router.delete(
  "/:id",
  authenticateToken,
  verifyRole("admin"),
  deleteBookDetails,
);
export default router;
