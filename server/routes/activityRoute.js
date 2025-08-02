import express from "express";
import { postTaskActivity, deleteActivity } from "../controllers/activityController.js";
import { protectRoute } from "../middleware/authMiddleware.js";

const router = express.Router();

// Thêm activity cho task
router.post("/activity/:id", protectRoute, postTaskActivity);
// Xóa activity
router.delete("/:taskId/activities/:activityId", protectRoute, deleteActivity);

export default router; 