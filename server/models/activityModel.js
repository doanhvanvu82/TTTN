import mongoose, { Schema } from "mongoose";

const activitySchema = new Schema({
  type: {
    type: String,
    default: "assigned",
    enum: [
      "assigned",
      "started",
      "in progress",
      "bug",
      "completed",
      "commented",
      "reminder_sent",
      "due_date_updated",
    ],
  },
  activity: String,
  date: { type: Date, default: new Date() },
  by: { type: Schema.Types.ObjectId, ref: "User" },
  task: { type: Schema.Types.ObjectId, ref: "Task", required: true },
}, { timestamps: true });

const Activity = mongoose.model("Activity", activitySchema);

export default Activity; 