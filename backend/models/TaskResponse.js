const mongoose = require("mongoose");

const taskResponseSchema = new mongoose.Schema(
  {
    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      required: [true, "Task reference is required"]
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Sender reference is required"]
    },
    message: {
      type: String,
      required: [true, "Response message cannot be empty"],
      trim: true
    }
  },
  {
    timestamps: true
  }
);

const TaskResponse = mongoose.model("TaskResponse", taskResponseSchema);

module.exports = TaskResponse;
