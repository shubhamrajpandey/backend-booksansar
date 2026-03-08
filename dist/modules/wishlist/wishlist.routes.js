"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const wishlist_controller_1 = require("./wishlist.controller");
const auth_middleware_1 = require("../../middlewares/auth.middleware");
const router = express_1.default.Router();
router.use(auth_middleware_1.authenticateToken);
router.route("/").get(wishlist_controller_1.getWishlist).post(wishlist_controller_1.addToWishlist).delete(wishlist_controller_1.clearWishlist);
router.get("/check/:bookId", wishlist_controller_1.checkWishlist);
router.delete("/:bookId", wishlist_controller_1.removeFromWishlist);
exports.default = router;
