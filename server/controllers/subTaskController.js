import asyncHandler from "express-async-handler";
import SubTask from "../models/subTaskModel.js";
import Task from "../models/taskModel.js";

const createSubTask = asyncHandler(async (req, res) => {
  const { title, tag, date, dueDate, dependencies } = req.body;
  const { id } = req.params; // id = taskId

  const task = await Task.findById(id);
  if (!task) {
    return res.status(404).json({ status: false, message: "Task not found." });
  }

  const newSubTask = await SubTask.create({
    title,
    date,
    dueDate: dueDate ? new Date(dueDate) : null,
    tag,
    isCompleted: false,
    dependencies: dependencies || [],
    task: id,
  });

  // Thêm subTaskId vào mảng subTasks của Task
  task.subTasks.push(newSubTask._id);
  await task.save();

  // Emit realtime event
  const io = req.app.get("io");
  if (io) {
    io.to(`task-${id}`).emit("subtask-added", { taskId: id, subTask: newSubTask });
    io.emit("subtask-added-global", { taskId: id, subTask: newSubTask });
  }

  res.status(200).json({ status: true, message: "SubTask added successfully.", subTask: newSubTask });
});

const updateSubTaskStage = asyncHandler(async (req, res) => {
  const { taskId, subTaskId } = req.params;
  const { status } = req.body;

  const subTask = await SubTask.findById(subTaskId);
  if (!subTask) {
    return res.status(404).json({ status: false, message: "SubTask not found." });
  }

  subTask.isCompleted = status;
  await subTask.save();

  // Emit realtime event
  const io = req.app.get("io");
  if (io) {
    io.to(`task-${taskId}`).emit("subtask-updated", { taskId: taskId, subTaskId, status });
    io.emit("subtask-updated-global", { taskId: taskId, subTaskId, status });
  }

  res.status(200).json({
    status: true,
    message: status ? "Task has been marked completed" : "Task has been marked uncompleted",
  });
});

// Xóa subtask
const deleteSubTask = asyncHandler(async (req, res) => {
  const { taskId, subTaskId } = req.params;
  const { userId, isProjectManager } = req.user;

  const subTask = await SubTask.findById(subTaskId);
  if (!subTask) {
    return res.status(404).json({ status: false, message: "SubTask not found." });
  }

  // Kiểm tra quyền: project manager hoặc admin
  if (!isProjectManager) {
    return res.status(403).json({ status: false, message: "Not authorized to delete this subtask." });
  }

  // Xóa subtask khỏi collection
  await SubTask.findByIdAndDelete(subTaskId);
  
  // Xóa subTaskId khỏi mảng subTasks của Task
  await Task.findByIdAndUpdate(taskId, { $pull: { subTasks: subTaskId } });

  // Emit realtime event
  const io = req.app.get("io");
  if (io) {
    io.to(`task-${taskId}`).emit("subtask-deleted", { taskId: taskId, subTaskId });
    io.emit("subtask-deleted-global", { taskId: taskId, subTaskId });
  }

  res.status(200).json({
    status: true,
    message: "SubTask deleted successfully.",
  });
});

export { createSubTask, updateSubTaskStage, deleteSubTask }; 