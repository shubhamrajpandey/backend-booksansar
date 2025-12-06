import { Router } from "express";
import { authenticateToken } from "../middlewares/auth.middleware";
import { verifyRole } from "../middlewares/role.middleware";
import {
  uploadBookDetails,
  getAllBooks,
  getSingleBook,
  updateBookDetails,
} from "../controllers/book.controller";

const router = Router();

router.post(
  "/",
  authenticateToken,
  verifyRole("vendor", "learner"), 
  uploadBookDetails
);

router.get("/", getAllBooks);

router.get("/:id", getSingleBook);

router.put(
  "/:id",
  authenticateToken,
  verifyRole("vendor", "learner", "admin"),
  updateBookDetails
);

export default router;
