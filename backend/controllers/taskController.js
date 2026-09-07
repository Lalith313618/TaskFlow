const Task = require('../models/Task');
const User = require('../models/User');
const asyncHandler = require("../middleware/asyncHandler");
const { sendTaskAssignedEmail } = require("../utils/emailService");
const { emitToUser, emitToTask, emitToAll } = require('../socket');

// @desc    Create and assign a task to an intern
// @route   POST /api/tasks
// @access  Private (Manager only)
const createTask = asyncHandler(async (req, res) => {
  const { title, description, priority, dueDate, internEmail, assignedTo } = req.body;

  if (!title) {
    return res.status(400).json({
      success: false,
      message: "Task title is required"
    });
  }

  let internUser = null;

  if (internEmail) {
    internUser = await User.findOne({ email: internEmail.trim().toLowerCase() });
    if (!internUser) {
      return res.status(400).json({
        success: false,
        message: `No intern found with email: ${internEmail}`
      });
    }
  } else if (assignedTo) {
    internUser = await User.findById(assignedTo);
    if (!internUser) {
      return res.status(400).json({
        success: false,
        message: "Assigned intern not found"
      });
    }
  } else {
    // If no intern specified, check if creator is manager or self-assigning
    if (req.user.role === "manager") {
      return res.status(400).json({
        success: false,
        message: "Please specify an intern email or select an intern to assign the task to"
      });
    } else {
      internUser = await User.findById(req.user.userId);
    }
  }

  const managerUser = await User.findById(req.user.userId);

  const task = await Task.create({
    title: title.trim(),
    description: description ? description.trim() : "",
    priority: priority || "medium",
    status: "pending",
    dueDate: dueDate || null,
    assignedTo: internUser._id,
    assignedBy: req.user.userId,
    user: internUser._id // Maintain backward compatibility
  });

  const populatedTask = await Task.findById(task._id)
    .populate("assignedTo", "name email")
    .populate("assignedBy", "name email");

  // Send assignment notification email asynchronously
  sendTaskAssignedEmail({
    toEmail: internUser.email,
    internName: internUser.name,
    taskTitle: task.title,
    taskDescription: task.description,
    dueDate: task.dueDate,
    priority: task.priority,
    managerName: managerUser ? managerUser.name : "Manager"
  }).catch((err) => console.error("Email notification dispatch error:", err.message));

  // Real-time socket notification to assigned intern
  if (internUser) {
    emitToUser(internUser._id.toString(), 'notification', {
      type: 'task_assigned',
      title: 'New Task Assigned',
      message: `${managerUser ? managerUser.name : 'Manager'} assigned you a new task: "${task.title}"`,
      taskId: task._id.toString(),
      priority: task.priority,
      createdAt: new Date().toISOString()
    });
  }
  emitToAll('task_created', { taskId: task._id.toString() });

  res.status(201).json({
    success: true,
    message: "Task assigned and created successfully",
    data: populatedTask
  });
});

// @desc    Get tasks according to user role
// @route   GET /api/tasks
// @access  Private
const getTasks = asyncHandler(async (req, res) => {
  const {
    status,
    priority,
    search,
    sort,
    internId,
    page = 1,
    limit = 10
  } = req.query;

  const filter = {};

  if (req.user.role === "manager") {
    // Only show tasks created/assigned by this manager
    filter.assignedBy = req.user.userId;
    if (internId) {
      filter.assignedTo = internId;
    }
  } else {
    // Intern only sees tasks assigned to them
    filter.$or = [
      { assignedTo: req.user.userId },
      { user: req.user.userId }
    ];
  }

  if (status) {
    filter.status = status;
  }

  if (priority) {
    filter.priority = priority;
  }

  if (search) {
    filter.title = {
      $regex: search,
      $options: "i"
    };
  }

  const skip = (Number(page) - 1) * Number(limit);

  const totalTasks = await Task.countDocuments(filter);

  const tasks = await Task.find(filter)
    .populate("assignedTo", "name email")
    .populate("assignedBy", "name email")
    .sort(sort || "-createdAt")
    .skip(skip)
    .limit(Number(limit));

  res.status(200).json({
    success: true,
    data: tasks,
    pagination: {
      currentPage: Number(page),
      limit: Number(limit),
      totalTasks,
      totalPages: Math.ceil(totalTasks / Number(limit))
    }
  });
});

// @desc    Get single task by ID
// @route   GET /api/tasks/:id
// @access  Private
const getTaskById = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id)
    .populate("assignedTo", "name email")
    .populate("assignedBy", "name email")
    .populate("submission.submittedBy", "name email role");

  if (!task) {
    return res.status(404).json({
      success: false,
      message: "Task not found"
    });
  }

  // Verify access permission
  const userId = req.user.userId.toString();
  const isAssignedIntern = task.assignedTo && task.assignedTo._id.toString() === userId;
  const isAssigningManager = task.assignedBy && task.assignedBy._id.toString() === userId;
  const isLegacyUser = task.user && task.user.toString() === userId;

  if (!isAssignedIntern && !isAssigningManager && !isLegacyUser && req.user.role !== "manager") {
    return res.status(403).json({
      success: false,
      message: "Access denied: You do not have permission to view this task"
    });
  }

  res.status(200).json({
    success: true,
    data: task
  });
});

// @desc    Update task details (Manager) or full task
// @route   PUT /api/tasks/:id
// @access  Private
const updateTask = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id);

  if (!task) {
    return res.status(404).json({
      success: false,
      message: "Task not found"
    });
  }

  const userId = req.user.userId.toString();
  const isManager = req.user.role === "manager";
  const isAssignedIntern = task.assignedTo && task.assignedTo.toString() === userId;

  if (!isManager && !isAssignedIntern) {
    return res.status(403).json({
      success: false,
      message: "You are not authorized to update this task"
    });
  }

  // If intern, only allow updating status
  if (!isManager && isAssignedIntern) {
    if (req.body.status) {
      task.status = req.body.status;
      await task.save();
    }
  } else {
    // Manager can update fields
    if (req.body.title !== undefined) task.title = req.body.title;
    if (req.body.description !== undefined) task.description = req.body.description;
    if (req.body.priority !== undefined) task.priority = req.body.priority;
    if (req.body.status !== undefined) task.status = req.body.status;
    if (req.body.dueDate !== undefined) task.dueDate = req.body.dueDate;

    if (req.body.internEmail) {
      const intern = await User.findOne({ email: req.body.internEmail.trim().toLowerCase() });
      if (intern) {
        task.assignedTo = intern._id;
        task.user = intern._id;
      }
    } else if (req.body.assignedTo) {
      task.assignedTo = req.body.assignedTo;
      task.user = req.body.assignedTo;
    }

    await task.save();
  }

  const updatedTask = await Task.findById(task._id)
    .populate("assignedTo", "name email")
    .populate("assignedBy", "name email");

  res.status(200).json({
    success: true,
    message: "Task updated successfully",
    data: updatedTask
  });
});

// @desc    Update task status (Intern / Manager)
// @route   PATCH /api/tasks/:id/status
// @access  Private
const updateTaskStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;

  if (!status || !["pending", "in-progress", "completed"].includes(status)) {
    return res.status(400).json({
      success: false,
      message: "Valid status ('pending', 'in-progress', 'completed') is required"
    });
  }

  const task = await Task.findById(req.params.id);

  if (!task) {
    return res.status(404).json({
      success: false,
      message: "Task not found"
    });
  }

  const userId = req.user.userId.toString();
  const isAssignedIntern = task.assignedTo && task.assignedTo.toString() === userId;
  const isAssigningManager = task.assignedBy && task.assignedBy.toString() === userId;
  const isLegacyUser = task.user && task.user.toString() === userId;

  if (!isAssignedIntern && !isAssigningManager && !isLegacyUser && req.user.role !== "manager") {
    return res.status(403).json({
      success: false,
      message: "You are not authorized to update this task's status"
    });
  }

  task.status = status;
  await task.save();

  const updated = await Task.findById(task._id)
    .populate("assignedTo", "name email")
    .populate("assignedBy", "name email");

  // Real-time socket status emission
  emitToTask(task._id.toString(), 'task_status_changed', {
    taskId: task._id.toString(),
    status: status,
    updatedBy: req.user.userId
  });

  const otherPartyId = isAssignedIntern ? task.assignedBy : task.assignedTo;
  if (otherPartyId) {
    emitToUser(otherPartyId.toString(), 'notification', {
      type: 'status_updated',
      title: 'Task Status Updated',
      message: `"${task.title}" status changed to ${status.toUpperCase()}`,
      taskId: task._id.toString(),
      status: status,
      createdAt: new Date().toISOString()
    });
  }

  res.status(200).json({
    success: true,
    message: `Task status updated to ${status}`,
    data: updated
  });
});

// @desc    Get task statistics for dashboard
// @route   GET /api/tasks/stats
// @access  Private
const getTaskStats = asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const isManager = req.user.role === "manager";

  let queryFilter = {};

  if (isManager) {
    queryFilter = { assignedBy: userId };
  } else {
    queryFilter = {
      $or: [{ assignedTo: userId }, { user: userId }]
    };
  }

  const [totalTasks, pending, inProgress, completed, highPriority, overdue, totalInterns, recentTasks] = await Promise.all([
    Task.countDocuments(queryFilter),
    Task.countDocuments({ ...queryFilter, status: "pending" }),
    Task.countDocuments({ ...queryFilter, status: "in-progress" }),
    Task.countDocuments({ ...queryFilter, status: "completed" }),
    Task.countDocuments({ ...queryFilter, priority: "high" }),
    Task.countDocuments({
      ...queryFilter,
      dueDate: { $lt: new Date() },
      status: { $ne: "completed" }
    }),
    isManager ? User.countDocuments({ role: { $ne: "manager" } }) : Promise.resolve(0),
    Task.find(queryFilter)
      .populate("assignedTo", "name email")
      .populate("assignedBy", "name email")
      .sort("-createdAt")
      .limit(5)
  ]);

  res.status(200).json({
    success: true,
    data: {
      totalTasks,
      pending,
      inProgress,
      completed,
      highPriority,
      overdue,
      totalInterns: isManager ? totalInterns : undefined,
      recentTasks,
      role: req.user.role
    }
  });
});

// @desc    Delete a task (Manager only)
// @route   DELETE /api/tasks/:id
// @access  Private (Manager)
const deleteTask = asyncHandler(async (req, res) => {
  const filter = { _id: req.params.id };

  // If manager, check if they assigned it or allow manager role
  if (req.user.role !== "manager") {
    return res.status(403).json({
      success: false,
      message: "Only managers can delete tasks"
    });
  }

  const deletedTask = await Task.findOneAndDelete(filter);

  if (!deletedTask) {
    return res.status(404).json({
      success: false,
      message: "Task not found"
    });
  }

  res.status(200).json({
    success: true,
    message: "Task deleted successfully",
    data: deletedTask
  });
});

// @desc    Submit task work & completion proof with attachments
// @route   POST /api/tasks/:id/submission
// @access  Private (Assigned intern)
const submitTaskWork = asyncHandler(async (req, res) => {
  const taskId = req.params.id;
  const userId = req.user.userId.toString();
  const { description } = req.body;

  const task = await Task.findById(taskId);
  if (!task) {
    return res.status(404).json({
      success: false,
      message: "Task not found"
    });
  }

  // Permission check: assigned intern, legacy task owner, or manager
  const isAssignedIntern = task.assignedTo && task.assignedTo.toString() === userId;
  const isLegacyUser = task.user && task.user.toString() === userId;

  if (!isAssignedIntern && !isLegacyUser && req.user.role !== "manager") {
    return res.status(403).json({
      success: false,
      message: "You are not authorized to submit work for this task"
    });
  }

  // Process uploaded files if any
  const attachments = [];
  if (req.files && Array.isArray(req.files)) {
    req.files.forEach(file => {
      attachments.push({
        fileName: file.originalname,
        fileUrl: `/uploads/${file.filename}`,
        fileType: file.mimetype,
        fileSize: file.size
      });
    });
  }

  task.submission = {
    description: (description || '').trim(),
    attachments: attachments,
    submittedAt: new Date(),
    submittedBy: req.user.userId
  };

  // Automatically mark task status as completed upon work submission
  task.status = 'completed';
  await task.save();

  // Also log into TaskResponse communication thread for audit trail
  const TaskResponse = require("../models/TaskResponse");
  const attachmentText = attachments.length > 0
    ? ` with ${attachments.length} attachment${attachments.length > 1 ? 's' : ''}`
    : '';
  const noteSnippet = (description || '').trim();
  const threadMsg = `🎓 [Work Submitted] Completed work proof submitted${attachmentText}.${noteSnippet ? `\nSummary: ${noteSnippet}` : ''}`;

  await TaskResponse.create({
    task: taskId,
    sender: req.user.userId,
    message: threadMsg
  });

  const updatedTask = await Task.findById(taskId)
    .populate("assignedTo", "name email")
    .populate("assignedBy", "name email")
    .populate("submission.submittedBy", "name email role");

  // Real-time socket work submission emission
  emitToTask(taskId.toString(), 'work_submitted', {
    taskId: taskId.toString(),
    task: updatedTask
  });

  if (task.assignedBy) {
    const intern = await User.findById(req.user.userId);
    emitToUser(task.assignedBy.toString(), 'notification', {
      type: 'work_submitted',
      title: 'Work Proof Submitted',
      message: `${intern ? intern.name : 'Intern'} submitted work completion proof for "${task.title}"`,
      taskId: taskId.toString(),
      createdAt: new Date().toISOString()
    });
  }

  res.status(200).json({
    success: true,
    message: "Work submitted successfully! Task marked as completed.",
    data: updatedTask
  });
});

module.exports = {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  updateTaskStatus,
  deleteTask,
  getTaskStats,
  submitTaskWork
};

