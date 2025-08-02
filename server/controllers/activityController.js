import asyncHandler from "express-async-handler";
import Activity from "../models/activityModel.js";
import Task from "../models/taskModel.js";

const postTaskActivity = asyncHandler(async (req, res) => {
  const { id } = req.params; // id = taskId
  const { userId } = req.user;
  const { type, activity } = req.body;

  const task = await Task.findById(id);
  if (!task) {
    return res.status(404).json({ status: false, message: "Task not found." });
  }

  const newActivity = await Activity.create({
    type,
    activity,
    by: userId,
    task: id,
  });

  // Thêm activityId vào mảng activities của Task
  task.activities.push(newActivity._id);
  await task.save();

  // Emit realtime event
  const io = req.app.get("io");
  if (io) {
    io.to(`task-${id}`).emit("activity-added", { taskId: id, activity: newActivity });
  }

  res.status(200).json({
    status: true,
    message: "Activity posted successfully.",
  });
});

// Xóa activity
const deleteActivity = asyncHandler(async (req, res) => {
  const { taskId, activityId } = req.params;
  const { userId, isProjectManager } = req.user;

  const activity = await Activity.findById(activityId);
  if (!activity) {
    return res.status(404).json({ status: false, message: "Activity not found." });
  }

  // Kiểm tra quyền: người tạo activity hoặc project manager
  const isAuthor = activity.by.toString() === userId;
  const isPM = isProjectManager;
  if (!isAuthor && !isPM) {
    return res.status(403).json({ status: false, message: "Not authorized to delete this activity." });
  }

  // Xóa activity khỏi collection
  await Activity.findByIdAndDelete(activityId);
  
  // Xóa activityId khỏi mảng activities của Task
  await Task.findByIdAndUpdate(taskId, { $pull: { activities: activityId } });

  // Emit realtime event
  const io = req.app.get("io");
  if (io) {
    io.to(`task-${taskId}`).emit("activity-deleted", { taskId: taskId, activityId });
  }

  res.status(200).json({
    status: true,
    message: "Activity deleted successfully.",
  });
});

export { postTaskActivity, deleteActivity }; 