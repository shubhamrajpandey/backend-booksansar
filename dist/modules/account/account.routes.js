"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const account_controller_1 = require("./account.controller");
const auth_middleware_1 = require("../../middlewares/auth.middleware");
const role_middleware_1 = require("../../middlewares/role.middleware");
const router = express_1.default.Router();
router.use(auth_middleware_1.authenticateToken);
router.route("/profile").get(account_controller_1.getProfile).put(account_controller_1.updateProfile);
router.get("/stats", (0, role_middleware_1.verifyRole)("learner"), account_controller_1.getReadingStats);
router.post("/stats/streak", (0, role_middleware_1.verifyRole)("learner"), account_controller_1.updateStreak);
router.get("/orders", (0, role_middleware_1.verifyRole)("learner"), account_controller_1.getOrders);
router.route("/preferences").get(account_controller_1.getPreferences).put(account_controller_1.updatePreferences);
router.delete("/", (0, role_middleware_1.verifyRole)("learner"), account_controller_1.deleteAccount);
exports.default = router;
