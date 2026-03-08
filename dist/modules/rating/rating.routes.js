"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const rating_controller_1 = require("./rating.controller");
const auth_middleware_1 = require("../../middlewares/auth.middleware");
const router = express_1.default.Router();
router.get("/book/:bookId", rating_controller_1.getBookRatings);
router.get("/user/:userId", rating_controller_1.getUserRatings);
router.use(auth_middleware_1.authenticateToken);
router.get("/book/:bookId/my-rating", rating_controller_1.getMyRating);
router.post("/", rating_controller_1.createRating);
router.put("/:ratingId", rating_controller_1.updateRating);
router.delete("/:ratingId", rating_controller_1.deleteRating);
router.post("/:ratingId/helpful", rating_controller_1.markHelpful);
exports.default = router;
