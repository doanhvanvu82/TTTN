import express from "express";
import { createSubTask, updateSubTaskStage, deleteSubTask } from "../controllers/subTaskController.js";
import { isProjectManagerRoute, protectRoute } from "../middleware/authMiddleware.js";

const router = express.Router();

// Tạo subtask cho task
router.put("/create-subtask/:id", protectRoute, isProjectManagerRoute, createSubTask);
// Cập nhật trạng thái subtask
router.put("/change-status/:taskId/:subTaskId", protectRoute, updateSubTaskStage);
// Xóa subtask
router.delete("/:taskId/subtasks/:subTaskId", protectRoute, isProjectManagerRoute, deleteSubTask);

export default router; 