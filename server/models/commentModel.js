import mongoose, { Schema } from "mongoose";

const commentSchema = new Schema({
  content: String,
  author: { type: Schema.Types.ObjectId, ref: "User" },
  date: { type: Date, default: new Date() },
  mentions: [{ type: Schema.Types.ObjectId, ref: "User" }],
  isEdited: { type: Boolean, default: false },
  editedAt: Date,
  task: { type: Schema.Types.ObjectId, ref: "Task", required: true },
}, { timestamps: true });

const Comment = mongoose.model("Comment", commentSchema);

export default Comment; 