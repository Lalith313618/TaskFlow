const User = require("../models/User");

const bcrypt = require("bcryptjs");

const jwt = require("jsonwebtoken");

const asyncHandler = require("../middleware/asyncHandler");

const registerUser = asyncHandler(async (req, res) => {

  const { name, email, password, role, managerAccessCode } = req.body;

  if (!name || !email || !password) {

    return res.status(400).json({
      success: false,
      message: "Name, email and password are required"
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
      message: "User already exists"
    });

  }

  if (role === "manager") {
    const expectedCode = (process.env.MANAGER_ACCESS_CODE || "").trim();
    if (!managerAccessCode || managerAccessCode.trim() !== expectedCode) {
      return res.status(400).json({
        success: false,
        message: "Invalid manager access code"
      });
    }
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const assignedRole = role === "manager" ? "manager" : "intern";

  const user = await User.create({
    name: name.trim(),
    email: normalizedEmail,
    password: hashedPassword,
    role: assignedRole
  });

  res.status(201).json({
    success: true,
    message: "User registered successfully",
    data: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role
    }
  });

});


const loginUser = asyncHandler(async (req, res) => {

  const email = req.body.email?.trim().toLowerCase();

  const { password } = req.body;

  if (!email || !password) {

    return res.status(400).json({
      success: false,
      message: "Email and password are required"
    });

  }

  const user = await User.findOne({ email });

  if (!user) {

    return res.status(401).json({
      success: false,
      message: "Invalid email or password"
    });

  }

  const isPasswordMatch = await bcrypt.compare(password, user.password);

  if (!isPasswordMatch) {

    return res.status(401).json({
      success: false,
      message: "Invalid email or password"
    });

  }

  const userRole = user.role || "intern";

  const token = jwt.sign(
    { userId: user._id, role: userRole },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  res.status(200).json({
    success: true,
    message: "Login successful",
    data: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: userRole,
      token
    }
  });

});
const getMe = asyncHandler(async (req, res) => {

  const user = await User.findById(req.user.userId).select("-password");

  if (!user) {

    return res.status(404).json({
      success: false,
      message: "User not found"
    });

  }

  res.status(200).json({
    success: true,
    data: user
  });

});
const updateMe = asyncHandler(async (req, res) => {

  const { name, email } = req.body;

  if (!name && !email) {
    return res.status(400).json({
      success: false,
      message: "Name or email is required"
    });
  }

  const updateData = {};

  if (name) {
    updateData.name = name.trim();
  }

  if (email) {
    updateData.email = email.trim().toLowerCase();
  }

  const existingUser = await User.findOne({
    email: updateData.email,
    _id: { $ne: req.user.userId }
  });

  if (existingUser) {
    return res.status(400).json({
      success: false,
      message: "Email already in use"
    });
  }

  const user = await User.findByIdAndUpdate(
    req.user.userId,
    updateData,
    {
      new: true,
      runValidators: true
    }
  ).select("-password");

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found"
    });
  }

  res.status(200).json({
    success: true,
    message: "Profile updated successfully",
    data: user
  });

});
const changePassword = asyncHandler(async (req, res) => {

  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({
      success: false,
      message: "Current password and new password are required"
    });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({
      success: false,
      message: "New password must be at least 6 characters"
    });
  }

  const user = await User.findById(req.user.userId);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found"
    });
  }

  const isPasswordMatch = await bcrypt.compare(
    currentPassword,
    user.password
  );

  if (!isPasswordMatch) {
    return res.status(401).json({
      success: false,
      message: "Current password is incorrect"
    });
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  user.password = hashedPassword;

  await user.save();

  res.status(200).json({
    success: true,
    message: "Password changed successfully"
  });

});


module.exports = {

  registerUser,
  loginUser,
  getMe,
  updateMe,
  changePassword

};