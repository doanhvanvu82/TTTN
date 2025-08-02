import mongoose, { Schema } from "mongoose";

const notificationSchema = new Schema(
  {
    recipient: { type: Schema.Types.ObjectId, ref: "User", required: true },
    sender: { type: Schema.Types.ObjectId, ref: "User" },
    type: {
      type: String,
      enum: [
        "task_assigned",
        "task_completed",
        "task_due_soon",
        "task_overdue",
        "mention",
        "reminder",
        "dependency_completed",
        "comment_added",
      ],
      required: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    task: { type: Schema.Types.ObjectId, ref: "Task" },
    isRead: { type: Boolean, default: false },
    isEmailSent: { type: Boolean, default: false },
    emailSentAt: Date,
    metadata: {
      dueDate: Date,
      priority: String,
      stage: String,
    },
  },
  { timestamps: true }
);

// Index cho tìm kiếm nhanh
notificationSchema.index({ recipient: 1, isRead: 1 });
notificationSchema.index({ createdAt: -1 });
notificationSchema.index({ type: 1 });

const Notification = mongoose.model("Notification", notificationSchema);

export default Notification;
