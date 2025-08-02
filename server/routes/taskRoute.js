import express from "express";
import {
  createTask,
  getTask,
  getTasks,
  trashTask,
  updateTask,
 
} from "../controllers/taskController.js";
import { isAdminRoute, isProjectManagerRoute, protectRoute } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/create", protectRoute, isProjectManagerRoute, createTask);
router.get("/", protectRoute, getTasks);
router.get("/:id", protectRoute, getTask);
router.put("/update/:id", protectRoute, isProjectManagerRoute, updateTask);
router.put("/:id", protectRoute, isProjectManagerRoute, trashTask);
router.get("/performance", protectRoute, getPerformanceReport);


export default router;
