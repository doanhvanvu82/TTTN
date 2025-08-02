import express from "express";
import userRoutes from "./userRoute.js";
import taskRoutes from "./taskRoute.js";
import subTaskRoutes from "./subTaskRoute.js";
import commentRoutes from "./commentRoute.js";
import reminderRoutes from "./reminderRoute.js";
import activityRoutes from "./activityRoute.js";

const router = express.Router();

router.use("/user", userRoutes);
router.use("/task", taskRoutes);
router.use("/task", subTaskRoutes);
router.use("/task", commentRoutes);
router.use("/task", reminderRoutes);
router.use("/task", activityRoutes);

export default router;
