import { Router } from "express";
import {
  applyAsRider,
  getAllApplications,
  getApplicationById,
  approveApplication,
  rejectApplication,
} from "./rider.application.controller";
import { authenticateToken } from "../../middlewares/auth.middleware";
import { verifyRole } from "../../middlewares/role.middleware";

const router = Router();

// ── Public ──────────────────────────────────────────────────
// Anyone can submit a rider application
router.post("/apply", applyAsRider);

// ── Admin only ──────────────────────────────────────────────
// All routes below require login + admin role
router.use(authenticateToken, verifyRole("admin"));

// GET all applications (with ?status=pending|approved|rejected filter)
router.get("/applications", getAllApplications);

// GET single application details
router.get("/applications/:id", getApplicationById);

// Approve an application → creates rider account → sends email
router.patch("/applications/:id/approve", approveApplication);

// Reject an application → sends email with reason
router.patch("/applications/:id/reject", rejectApplication);

export default router;
