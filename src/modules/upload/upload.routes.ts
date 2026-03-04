import { Router } from "express";
import { upload } from "../../middlewares/upload.middleware";
import { uploadFile } from "./upload.controller";

const router = Router();

router.post("/", upload.single("image"), uploadFile);

export default router;
