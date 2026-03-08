"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const bookmark_controller_1 = require("./bookmark.controller");
const auth_middleware_1 = require("../../middlewares/auth.middleware");
const router = express_1.default.Router();
router.post("/toggle", auth_middleware_1.authenticateToken, bookmark_controller_1.toggleBookmark);
router.get("/", auth_middleware_1.authenticateToken, bookmark_controller_1.getUserBookmarks);
router.get("/check/:bookId", auth_middleware_1.authenticateToken, bookmark_controller_1.checkBookmark);
exports.default = router;
