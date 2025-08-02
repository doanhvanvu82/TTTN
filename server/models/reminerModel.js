import mongoose, { Schema } from "mongoose";

const reminderSchema = new Schema({
  type: { type: String, enum: ["email", "in-app"], default: "in-app" },
  time: { type: Date, required: true },
  sent: { type: Boolean, default: false },
  message: String,
  task: { type: Schema.Types.ObjectId, ref: "Task", required: true },
}, { timestamps: true });

const Reminder = mongoose.model("Reminder", reminderSchema);

export default Reminder; 