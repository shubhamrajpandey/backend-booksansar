 import express from "express";
import {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  clearWishlist,
  checkWishlist,
} from "../controllers/wishlist.controller";
import { authenticateToken } from "../middlewares/auth.middleware";

const router = express.Router();

router.use(authenticateToken);

router.route("/").get(getWishlist).post(addToWishlist).delete(clearWishlist);

router.get("/check/:bookId", checkWishlist);

router.delete("/:bookId", removeFromWishlist);

export default router;