const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");
const {
  getAllInterns,
  getInternById,
  createIntern,
  updateIntern,
  deleteIntern,
  testEmail
} = require("../controllers/internController");

router.use(authMiddleware);
router.use(authorize("manager"));

router.get("/interns", getAllInterns);
router.post("/interns", createIntern);
router.get("/interns/:id", getInternById);
router.put("/interns/:id", updateIntern);
router.delete("/interns/:id", deleteIntern);
router.post("/test-email", testEmail);

module.exports = router;
