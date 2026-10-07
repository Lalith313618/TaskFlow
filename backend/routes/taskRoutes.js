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

router.use(authMiddleware);

router.get("/stats", getTaskStats);

router.get("/", getTasks);
router.post("/", authorize("manager"), createTask);
router.get("/:id", getTaskById);
router.put("/:id", updateTask);
router.patch("/:id/status", updateTaskStatus);
router.delete("/:id", authorize("manager"), deleteTask);

router.post("/:id/submission", upload.array("files", 10), submitTaskWork);

router.get("/:id/responses", getResponses);
router.post("/:id/responses", addResponse);

module.exports = router;