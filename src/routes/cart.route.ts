import express from "express";
import {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
} from "../controllers/cart.controller";
import { authenticateToken } from "../middlewares/auth.middleware";

const router = express.Router();

router.use(authenticateToken);

router.route("/").get(getCart).post(addToCart).delete(clearCart);

router.route("/:bookId").put(updateCartItem).delete(removeFromCart);

export default router;