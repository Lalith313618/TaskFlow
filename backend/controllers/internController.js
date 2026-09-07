const User = require("../models/User");
const Task = require("../models/Task");
const asyncHandler = require("../middleware/asyncHandler");

// @desc    Get all interns with task stats
// @route   GET /api/admin/interns
// @access  Private (Manager only)
const getAllInterns = asyncHandler(async (req, res) => {
  const interns = await User.find({ role: { $ne: "manager" } }).select("-password").sort({ name: 1 });

  // Enrich with task counts
  const internsWithStats = await Promise.all(
    interns.map(async (intern) => {
      const [totalTasks, pendingTasks, completedTasks] = await Promise.all([
        Task.countDocuments({ assignedTo: intern._id }),
        Task.countDocuments({ assignedTo: intern._id, status: { $ne: "completed" } }),
        Task.countDocuments({ assignedTo: intern._id, status: "completed" })
      ]);

      return {
        _id: intern._id,
        name: intern.name,
        email: intern.email,
        createdAt: intern.createdAt,
        totalTasks,
        pendingTasks,
        completedTasks
      };
    })
  );

  res.status(200).json({
    success: true,
    data: internsWithStats
  });
});

// @desc    Get single intern details and their assigned tasks
// @route   GET /api/admin/interns/:id
// @access  Private (Manager only)
const getInternById = asyncHandler(async (req, res) => {
  const intern = await User.findOne({ _id: req.params.id, role: { $ne: "manager" } }).select("-password");

  if (!intern) {
    return res.status(404).json({
      success: false,
      message: "Intern not found"
    });
  }

  const tasks = await Task.find({ assignedTo: intern._id })
    .populate("assignedBy", "name email")
    .sort("-createdAt");

  res.status(200).json({
    success: true,
    data: {
      intern,
      tasks
    }
  });
});

// @desc    Test real-time email dispatch
// @route   POST /api/admin/test-email
// @access  Private (Manager only)
const testEmail = asyncHandler(async (req, res) => {
  const { testEmail: targetEmail } = req.body;
  const destination = targetEmail || req.user.email;

  const { sendTaskAssignedEmail } = require("../utils/emailService");
  const result = await sendTaskAssignedEmail({
    toEmail: destination,
    internName: "Test Intern",
    taskTitle: "Verify Real-Time Email Delivery",
    taskDescription: "This is a real-time test notification sent directly from the TaskFlow system to verify spam-free delivery.",
    dueDate: new Date(Date.now() + 86400000),
    priority: "high",
    managerName: "System Administrator"
  });

  if (result.simulated) {
    return res.status(200).json({
      success: true,
      simulated: true,
      message: "Email credentials not yet set in backend/.env. Simulated in server console."
    });
  }

  if (!result.success) {
    return res.status(400).json({
      success: false,
      message: `Failed to deliver email: ${result.error}`
    });
  }

  res.status(200).json({
    success: true,
    message: `Real-time test email delivered successfully to ${destination}! Check your inbox.`,
    messageId: result.messageId
  });
});

const bcrypt = require("bcryptjs");

// @desc    Register a new intern (Manager only)
// @route   POST /api/admin/interns
// @access  Private (Manager only)
const createIntern = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({
      success: false,
      message: "Name, email, and password are required"
    });
  }

  if (password.length < 6) {
    return res.status(400).json({
      success: false,
      message: "Password must be at least 6 characters"
    });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    return res.status(400).json({
      success: false,
      message: "A user with this email address already exists"
    });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const intern = await User.create({
    name: name.trim(),
    email: normalizedEmail,
    password: hashedPassword,
    role: "intern"
  });

  res.status(201).json({
    success: true,
    message: `Intern account created successfully for ${intern.name}! They can now log in using these credentials.`,
    data: {
      _id: intern._id,
      name: intern.name,
      email: intern.email,
      role: intern.role,
      createdAt: intern.createdAt
    }
  });
});

// @desc    Update an intern's details (Manager only)
// @route   PUT /api/admin/interns/:id
// @access  Private (Manager only)
const updateIntern = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  const intern = await User.findOne({ _id: req.params.id, role: { $ne: "manager" } });
  if (!intern) {
    return res.status(404).json({
      success: false,
      message: "Intern not found"
    });
  }

  if (name) {
    intern.name = name.trim();
  }

  if (email && email.trim().toLowerCase() !== intern.email) {
    const normalizedEmail = email.trim().toLowerCase();
    const emailExists = await User.findOne({
      email: normalizedEmail,
      _id: { $ne: intern._id }
    });
    if (emailExists) {
      return res.status(400).json({
        success: false,
        message: "Email address is already taken by another user"
      });
    }
    intern.email = normalizedEmail;
  }

  if (password) {
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 6 characters"
      });
    }
    intern.password = await bcrypt.hash(password, 10);
  }

  await intern.save();

  res.status(200).json({
    success: true,
    message: "Intern details updated successfully",
    data: {
      _id: intern._id,
      name: intern.name,
      email: intern.email,
      role: intern.role
    }
  });
});

// @desc    Delete an intern (Manager only)
// @route   DELETE /api/admin/interns/:id
// @access  Private (Manager only)
const deleteIntern = asyncHandler(async (req, res) => {
  const intern = await User.findOneAndDelete({ _id: req.params.id, role: { $ne: "manager" } });

  if (!intern) {
    return res.status(404).json({
      success: false,
      message: "Intern not found"
    });
  }

  // Also clean up tasks previously assigned to this intern
  await Task.deleteMany({ assignedTo: intern._id });

  res.status(200).json({
    success: true,
    message: `Intern "${intern.name}" deleted successfully`,
    data: {
      _id: intern._id,
      name: intern.name
    }
  });
});

module.exports = {
  getAllInterns,
  getInternById,
  createIntern,
  updateIntern,
  deleteIntern,
  testEmail
};
