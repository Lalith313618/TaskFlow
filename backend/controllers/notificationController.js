const Notification = require("../models/Notification");
const asyncHandler = require("../middleware/asyncHandler");
const { emitToUser } = require("../socket");

const sendNotification = async ({ recipient, sender, type, title, message, taskId }) => {
  try {
    if (!recipient) return null;

    const notif = await Notification.create({
      recipient,
      sender: sender || null,
      type: type || "general",
      title,
      message,
      taskId: taskId || null,
      read: false
    });

    emitToUser(recipient.toString(), "notification", {
      id: notif._id.toString(),
      _id: notif._id.toString(),
      type: notif.type,
      title: notif.title,
      message: notif.message,
      taskId: notif.taskId ? notif.taskId.toString() : undefined,
      read: false,
      createdAt: notif.createdAt.toISOString()
    });

    return notif;
  } catch (error) {
    console.error("Error creating/sending notification:", error.message);
    return null;
  }
};
const getMyNotifications = asyncHandler(async (req, res) => {
  const userId = req.user.userId;

  const notifications = await Notification.find({ recipient: userId })
    .sort({ createdAt: -1 })
    .limit(40);

  const unreadCount = await Notification.countDocuments({
    recipient: userId,
    read: false
  });

  res.status(200).json({
    success: true,
    unreadCount,
    count: notifications.length,
    data: notifications
  });
});
const markAsRead = asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const { id } = req.params;

  const notif = await Notification.findOneAndUpdate(
    { _id: id, recipient: userId },
    { read: true },
    { new: true }
  );

  if (!notif) {
    return res.status(404).json({
      success: false,
      message: "Notification not found"
    });
  }

  res.status(200).json({
    success: true,
    data: notif
  });
});
const markAllAsRead = asyncHandler(async (req, res) => {
  const userId = req.user.userId;

  await Notification.updateMany(
    { recipient: userId, read: false },
    { read: true }
  );

  res.status(200).json({
    success: true,
    message: "All notifications marked as read"
  });
});
const clearAllNotifications = asyncHandler(async (req, res) => {
  const userId = req.user.userId;

  await Notification.deleteMany({ recipient: userId });

  res.status(200).json({
    success: true,
    message: "All notifications cleared"
  });
});

module.exports = {
  sendNotification,
  getMyNotifications,
  markAsRead,
  markAllAsRead,
  clearAllNotifications
};
