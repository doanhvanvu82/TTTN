import express from "express";
import {
  createTask,
  dashboardStatistics,
  deleteRestoreTask,
  duplicateTask,
  getTask,
  getTasks,
  trashTask,
  updateTask,
  updateTaskStage,
  getTasksForCalendar,
  getPerformanceReport,
  getTaskTeam,
} from "../controllers/taskController.js";
import { isAdminRoute, isProjectManagerRoute, protectRoute } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/create", protectRoute, isProjectManagerRoute, createTask);
router.post("/duplicate/:id", protectRoute, isProjectManagerRoute, duplicateTask);

router.get("/dashboard", protectRoute, dashboardStatistics);
router.get("/calendar", protectRoute, getTasksForCalendar);
router.get("/performance", protectRoute, getPerformanceReport);
router.get("/", protectRoute, getTasks);
router.get("/:id", protectRoute, getTask);
router.get('/:id/team', protectRoute, getTaskTeam);

router.put("/update/:id", protectRoute, isProjectManagerRoute, updateTask);
router.put("/change-stage/:id", protectRoute, updateTaskStage);
router.put("/:id", protectRoute, isProjectManagerRoute, trashTask);

router.delete(
  "/delete-restore/:id?",
  protectRoute,
  isProjectManagerRoute,
  deleteRestoreTask
);

export default router;
