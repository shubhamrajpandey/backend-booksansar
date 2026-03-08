"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const note_controller_1 = require("./note.controller");
const auth_middleware_1 = require("../../middlewares/auth.middleware");
const router = express_1.default.Router();
router.post("/", auth_middleware_1.authenticateToken, note_controller_1.createNote);
router.get("/:bookId", auth_middleware_1.authenticateToken, note_controller_1.getNotes);
router.get("/", auth_middleware_1.authenticateToken, note_controller_1.getAllUserNotes);
router.put("/:noteId", auth_middleware_1.authenticateToken, note_controller_1.updateNote);
router.delete("/:noteId", auth_middleware_1.authenticateToken, note_controller_1.deleteNote);
exports.default = router;
