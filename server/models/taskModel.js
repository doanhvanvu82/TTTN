import mongoose, { Schema } from "mongoose";

const taskSchema = new Schema(
  {
    title: { type: String, required: true },
    date: { type: Date, default: new Date() },
    startDate: { type: Date },
    dueDate: { type: Date },
    reminders: [{ type: Schema.Types.ObjectId, ref: "Reminder" }],
    dependencies: [{ type: Schema.Types.ObjectId, ref: "Task" }],
    comments: [{ type: Schema.Types.ObjectId, ref: "Comment" }],
    priority: {
      type: String,
      default: "normal",
      enum: ["high", "medium", "normal", "low"],
    },
    stage: {
      type: String,
      default: "todo",
      enum: ["todo", "in progress", "completed"],
    },
    activities: [{ type: Schema.Types.ObjectId, ref: "Activity" }],
    subTasks: [{ type: Schema.Types.ObjectId, ref: "SubTask" }],
    description: String,
    assets: [String],
    links: [String],
    projectManager: { type: Schema.Types.ObjectId, ref: "User", required: true }, // Project Manager của task
    team: [{ type: Schema.Types.ObjectId, ref: "User" }], // Team members được assign
    isTrashed: { type: Boolean, default: false },
    completedAt: Date,
    estimatedHours: Number,
    actualHours: Number,
  },
  { timestamps: true }
);

taskSchema.index({ dueDate: 1 });
taskSchema.index({ stage: 1 });
taskSchema.index({ team: 1 });
taskSchema.index({ "comments.mentions": 1 });

const Task = mongoose.model("Task", taskSchema);

export default Task;
