"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const highlight_controller_1 = require("./highlight.controller");
const auth_middleware_1 = require("../../middlewares/auth.middleware");
const router = express_1.default.Router();
router.post("/", auth_middleware_1.authenticateToken, highlight_controller_1.addHighlight);
router.get("/book/:bookId", auth_middleware_1.authenticateToken, highlight_controller_1.getHighlights);
router.get("/", auth_middleware_1.authenticateToken, highlight_controller_1.getAllUserHighlights);
router.delete("/:highlightId", auth_middleware_1.authenticateToken, highlight_controller_1.deleteHighlight);
exports.default = router;
