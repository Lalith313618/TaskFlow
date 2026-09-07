const { Server } = require('socket.io');

let io = null;

function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
    }
  });

  io.on('connection', (socket) => {
    // Client joins their user-specific notification room
    socket.on('join_user', (userId) => {
      if (userId) {
        socket.join(`user_${userId}`);
      }
    });

    // Client enters a task discussion thread room
    socket.on('join_task', (taskId) => {
      if (taskId) {
        socket.join(`task_${taskId}`);
      }
    });

    // Client leaves a task discussion room
    socket.on('leave_task', (taskId) => {
      if (taskId) {
        socket.leave(`task_${taskId}`);
      }
    });

    socket.on('disconnect', () => {
      // Clean up on disconnect
    });
  });

  return io;
}

function getIO() {
  return io;
}

function emitToUser(userId, event, data) {
  if (io && userId) {
    io.to(`user_${userId}`).emit(event, data);
  }
}

function emitToTask(taskId, event, data) {
  if (io && taskId) {
    io.to(`task_${taskId}`).emit(event, data);
  }
}

function emitToAll(event, data) {
  if (io) {
    io.emit(event, data);
  }
}

module.exports = {
  initSocket,
  getIO,
  emitToUser,
  emitToTask,
  emitToAll
};
