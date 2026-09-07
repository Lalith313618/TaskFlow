const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
title: {
    type: String,
    required: [true, "Task title is required"],
    trim: true,
    minlength: [3, "Title must be at least 3 characters"]
  },

  description: {
    type: String,
    trim: true
  },

  status: {
    type: String,
    enum: ['pending', 'in-progress', 'completed'],
    default: 'pending'
  },

  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },

  dueDate: {
    type: Date
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: [true, "Assigned intern is required"]
  },
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: [true, "Assigned manager is required"]
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  submission: {
    description: {
      type: String,
      trim: true
    },
    attachments: [
      {
        fileName: { type: String },
        fileUrl: { type: String },
        fileType: { type: String },
        fileSize: { type: Number }
      }
    ],
    submittedAt: {
      type: Date
    },
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }
  }
}, {
  timestamps: true
});

const Task = mongoose.model('Task', taskSchema);

module.exports = Task;