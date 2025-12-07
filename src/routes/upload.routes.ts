import { Router } from "express";
import { upload } from "../middlewares/upload.middleware";
import { uploadFile } from "../controllers/upload.controller";
import { authenticateToken } from "../middlewares/auth.middleware";

const router = Router();

router.post("/upload", authenticateToken, upload.single("image"), uploadFile);

export default router;
