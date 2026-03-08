"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const upload_middleware_1 = require("../../middlewares/upload.middleware");
const upload_controller_1 = require("./upload.controller");
const router = (0, express_1.Router)();
router.post("/", upload_middleware_1.upload.single("image"), upload_controller_1.uploadFile);
exports.default = router;
