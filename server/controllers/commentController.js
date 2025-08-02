import asyncHandler from "express-async-handler";
import Comment from "../models/commentModel.js";
import Task from "../models/taskModel.js";

// Thêm comment với mentions
const addComment = asyncHandler(async (req, res) => {
  const { id } = req.params; // id = taskId
  const { userId } = req.user;
  const { content, mentions } = req.body;

  const task = await Task.findById(id);
  if (!task) {
    return res.status(404).json({ status: false, message: "Task not found." });
  }

  const comment = await Comment.create({
    content,
    author: userId,
    mentions: mentions || [],
    task: id,
  });

  // Thêm commentId vào mảng comments của Task
  task.comments.push(comment._id);
  await task.save();

  // Populate comment data trước khi trả về
  await comment.populate([
    { path: "author", select: "name email" },
    { path: "mentions", select: "name email" }
  ]);

  // Emit Socket.IO event cho real-time updates
  const io = req.app.get("io");
  if (io) {
    io.to(`task-${id}`).emit("new-comment", {
      taskId: id,
      comment
    });
  }

  res.status(200).json({
    status: true,
    comment,
    message: "Comment added successfully.",
  });
});

// Cập nhật comment
const updateComment = asyncHandler(async (req, res) => {
  const { taskId, commentId } = req.params;
  const { userId, isProjectManager } = req.user;
  const { content } = req.body;

  const comment = await Comment.findById(commentId);
  if (!comment) {
    return res.status(404).json({ status: false, message: "Comment not found." });
  }

  // Kiểm tra quyền: author của comment hoặc project manager
  const isAuthor = comment.author.toString() === userId;
  const isPM = isProjectManager;
  if (!isAuthor && !isPM) {
    return res.status(403).json({ status: false, message: "Not authorized to edit this comment." });
  }

  comment.content = content;
  comment.isEdited = true;
  comment.editedAt = new Date();
  await comment.save();

  // Emit Socket.IO event cho real-time updates
  const io = req.app.get("io");
  if (io) {
    io.to(`task-${taskId}`).emit("comment-updated", {
      taskId,
      commentId,
      content,
      isEdited: true,
      editedAt: comment.editedAt
    });
  }

  res.status(200).json({
    status: true,
    message: "Comment updated successfully.",
  });
});

// Xóa comment
const deleteComment = asyncHandler(async (req, res) => {
  const { taskId, commentId } = req.params;
  const { userId, isProjectManager } = req.user;

  const comment = await Comment.findById(commentId);
  if (!comment) {
    return res.status(404).json({ status: false, message: "Comment not found." });
  }

  // Kiểm tra quyền: author của comment hoặc project manager
  const isAuthor = comment.author.toString() === userId;
  const isPM = isProjectManager;
  if (!isAuthor && !isPM) {
    return res.status(403).json({ status: false, message: "Not authorized to delete this comment." });
  }

  // Xóa comment khỏi collection
  await Comment.findByIdAndDelete(commentId);
  // Xóa commentId khỏi mảng comments của Task
  await Task.findByIdAndUpdate(comment.task, { $pull: { comments: commentId } });

  // Emit Socket.IO event cho real-time updates
  const io = req.app.get("io");
  if (io) {
    io.to(`task-${taskId}`).emit("comment-deleted", {
      taskId,
      commentId
    });
  }

  res.status(200).json({
    status: true,
    message: "Comment deleted successfully.",
  });
});

export { addComment, updateComment, deleteComment }; 