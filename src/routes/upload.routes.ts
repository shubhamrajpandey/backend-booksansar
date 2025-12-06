import { Router } from "express";
import { upload } from "../middlewares/upload.middleware";
import { uploadImage } from "../controllers/upload.controller";
import { verifyRole } from "../middlewares/role.middleware";
import { authenticateToken } from "../middlewares/auth.middleware";

const router = Router();

router.post("/upload", authenticateToken, upload.single("image"), uploadImage);

export default router;
