import express from "express";
import { addComment, updateComment, deleteComment } from "../controllers/commentController.js";
import { protectRoute } from "../middleware/authMiddleware.js";

const router = express.Router();

// Thêm comment vào task
router.post("/:id/comments", protectRoute, addComment);
// Sửa comment
router.put("/:taskId/comments/:commentId", protectRoute, updateComment);
// Xóa comment
router.delete("/:taskId/comments/:commentId", protectRoute, deleteComment);

export default router; 