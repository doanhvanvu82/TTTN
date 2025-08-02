import asyncHandler from "express-async-handler";
import Reminder from "../models/reminderModel.js";
import Task from "../models/taskModel.js";

// Thêm reminder
const addReminder = asyncHandler(async (req, res) => {
  const { id } = req.params; // id = taskId
  const { type, time, message } = req.body;

  const task = await Task.findById(id);
  if (!task) {
    return res.status(404).json({ status: false, message: "Task not found." });
  }

  const reminder = await Reminder.create({
    type: type || "in-app",
    time: new Date(time),
    message: message || `Reminder for task: ${task.title}`,
    sent: false,
    task: id,
  });

  // Thêm reminderId vào mảng reminders của Task
  task.reminders.push(reminder._id);
  await task.save();

  // Emit realtime event
  const io = req.app.get("io");
  if (io) {
    io.to(`task-${id}`).emit("reminder-added", { taskId: id, reminder });
  }

  res.status(200).json({
    status: true,
    reminder,
    message: "Reminder added successfully.",
  });
});

// Xóa reminder
const deleteReminder = asyncHandler(async (req, res) => {
  const { taskId, reminderId } = req.params;

  const reminder = await Reminder.findById(reminderId);
  if (!reminder) {
    return res.status(404).json({ status: false, message: "Reminder not found." });
  }

  // Xóa reminder khỏi collection
  await Reminder.findByIdAndDelete(reminderId);
  // Xóa reminderId khỏi mảng reminders của Task
  await Task.findByIdAndUpdate(reminder.task, { $pull: { reminders: reminderId } });

  // Emit realtime event
  const io = req.app.get("io");
  if (io) {
    io.to(`task-${taskId}`).emit("reminder-deleted", { taskId: taskId, reminderId });
  }

  res.status(200).json({
    status: true,
    message: "Reminder deleted successfully.",
  });
});

export { addReminder, deleteReminder }; 