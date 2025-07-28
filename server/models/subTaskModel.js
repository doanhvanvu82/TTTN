import mongoose, { Schema } from "mongoose";

const subTaskSchema = new Schema({
  title: String,
  date: Date,
  dueDate: Date,
  tag: String,
  isCompleted: Boolean,
  dependencies: [{ type: Schema.Types.ObjectId, ref: "Task" }],
  task: { type: Schema.Types.ObjectId, ref: "Task", required: true },
}, { timestamps: true });

const SubTask = mongoose.model("SubTask", subTaskSchema);

export default SubTask; 