const express = require('express');
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");
const upload = require("../middleware/uploadMiddleware");

const {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  updateTaskStatus,
  deleteTask,
  getTaskStats,
  submitTaskWork
} = require('../controllers/taskController');

const {
  addResponse,
  getResponses
} = require('../controllers/responseController');

// All task routes require authentication
router.use(authMiddleware);

// Statistics
router.get("/stats", getTaskStats);

// Tasks CRUD
router.get("/", getTasks);
router.post("/", authorize("manager"), createTask);
router.get("/:id", getTaskById);
router.put("/:id", updateTask);
router.patch("/:id/status", updateTaskStatus);
router.delete("/:id", authorize("manager"), deleteTask);

// Task Work Submission (Intern submits completed work proof with files/images)
router.post("/:id/submission", upload.array("files", 10), submitTaskWork);

// Task Communication Thread
router.get("/:id/responses", getResponses);
router.post("/:id/responses", addResponse);

module.exports = router;