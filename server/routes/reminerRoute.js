import express from "express";
import { addReminder, deleteReminder } from "../controllers/reminderController.js";
import { protectRoute } from "../middleware/authMiddleware.js";

const router = express.Router();

// Thêm reminder vào task
router.post("/:id/reminders", protectRoute, addReminder);
// Xóa reminder khỏi task
router.delete("/:taskId/reminders/:reminderId", protectRoute, deleteReminder);

export default router; 