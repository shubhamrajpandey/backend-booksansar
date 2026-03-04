import express from "express";
import {
  getBookRatings,
  getMyRating,
  getUserRatings,
  createRating,
  updateRating,
  deleteRating,
  markHelpful,
} from "./rating.controller";
import { authenticateToken } from "../../middlewares/auth.middleware";

const router = express.Router();

router.get("/book/:bookId", getBookRatings);
router.get("/user/:userId", getUserRatings);

router.use(authenticateToken);

router.get("/book/:bookId/my-rating", getMyRating);
router.post("/", createRating);
router.put("/:ratingId", updateRating);
router.delete("/:ratingId", deleteRating);
router.post("/:ratingId/helpful", markHelpful);

export default router;
