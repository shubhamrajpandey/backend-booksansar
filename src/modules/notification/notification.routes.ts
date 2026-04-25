import { Router } from "express";
import {
  getMyNotifications,
  markOneRead,
  markAllRead,
  deleteOne,
  clearAll,
  saveFcmToken,
} from "./notification.controller";
import { authenticateToken } from "../../middlewares/auth.middleware";

const router = Router();

router.use(authenticateToken);

router.get("/", getMyNotifications);
router.patch("/read-all", markAllRead);
router.patch("/:id/read", markOneRead);
router.delete("/", clearAll);
router.delete("/:id", deleteOne);
router.post("/fcm-token", saveFcmToken);

export default router;