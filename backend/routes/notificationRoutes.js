const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const {
  getMyNotifications,
  markAsRead,
  markAllAsRead,
  clearAllNotifications
} = require("../controllers/notificationController");

// All routes require authentication
router.use(authMiddleware);

router.get("/", getMyNotifications);
router.put("/mark-all-read", markAllAsRead);
router.put("/:id/read", markAsRead);
router.delete("/", clearAllNotifications);

module.exports = router;
