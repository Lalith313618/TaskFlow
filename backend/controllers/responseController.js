const TaskResponse = require("../models/TaskResponse");
const Task = require("../models/Task");
const asyncHandler = require("../middleware/asyncHandler");

// @desc    Add a message/response to a task thread
// @route   POST /api/tasks/:id/responses
// @access  Private (Assigned intern or manager)
const addResponse = asyncHandler(async (req, res) => {
  const { message } = req.body;
  const taskId = req.params.id;
  const userId = req.user.userId;

  if (!message || !message.trim()) {
    return res.status(400).json({
      success: false,
      message: "Message cannot be empty"
    });
  }

  const task = await Task.findById(taskId);
  if (!task) {
    return res.status(404).json({
      success: false,
      message: "Task not found"
    });
  }

  // Verify permission: User must be either the assigned intern, the assigning manager, or the owner
  const isAssignedIntern = task.assignedTo && task.assignedTo.toString() === userId.toString();
  const isAssigningManager = task.assignedBy && task.assignedBy.toString() === userId.toString();
  const isLegacyUser = task.user && task.user.toString() === userId.toString();

  if (!isAssignedIntern && !isAssigningManager && !isLegacyUser && req.user.role !== "manager") {
    return res.status(403).json({
      success: false,
      message: "You are not authorized to respond to this task"
    });
  }

  const responseDoc = await TaskResponse.create({
    task: taskId,
    sender: userId,
    message: message.trim()
  });

  const populatedResponse = await TaskResponse.findById(responseDoc._id).populate("sender", "name email role");

  res.status(201).json({
    success: true,
    message: "Response sent successfully",
    data: populatedResponse
  });
});

// @desc    Get all messages/responses for a task
// @route   GET /api/tasks/:id/responses
// @access  Private (Assigned intern or manager)
const getResponses = asyncHandler(async (req, res) => {
  const taskId = req.params.id;
  const userId = req.user.userId;

  const task = await Task.findById(taskId);
  if (!task) {
    return res.status(404).json({
      success: false,
      message: "Task not found"
    });
  }

  const isAssignedIntern = task.assignedTo && task.assignedTo.toString() === userId.toString();
  const isAssigningManager = task.assignedBy && task.assignedBy.toString() === userId.toString();
  const isLegacyUser = task.user && task.user.toString() === userId.toString();

  if (!isAssignedIntern && !isAssigningManager && !isLegacyUser && req.user.role !== "manager") {
    return res.status(403).json({
      success: false,
      message: "You are not authorized to view messages for this task"
    });
  }

  const responses = await TaskResponse.find({ task: taskId })
    .populate("sender", "name email role")
    .sort({ createdAt: 1 });

  res.status(200).json({
    success: true,
    data: responses
  });
});

module.exports = {
  addResponse,
  getResponses
};
