const express = require("express");

const {
  registerUser,
  loginUser,
  getMe,
  updateMe,
  changePassword
} = require("../controllers/authController");

const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/register", registerUser);

router.post("/login", loginUser);

router.get("/me", authMiddleware, getMe);

router.put("/me", authMiddleware, updateMe);

router.put("/change-password", authMiddleware, changePassword);

module.exports = router;