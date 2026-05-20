const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

let io;

const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000
  });

  // JWT authentication middleware for Socket.IO
  io.use((socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

    if (!token) {
      return next(new Error('Authentication required'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.userId;
      socket.roleId = decoded.roleId;
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    logger.info(`Socket connected: ${socket.id} (user: ${socket.userId})`);

    // Join user's personal room
    socket.join(`user:${socket.userId}`);

    // Join project rooms
    socket.on('join_project', (projectId) => {
      socket.join(`project:${projectId}`);
      logger.info(`User ${socket.userId} joined project room: ${projectId}`);
    });

    socket.on('leave_project', (projectId) => {
      socket.leave(`project:${projectId}`);
    });

    // Time tracking heartbeat
    socket.on('activity_ping', (data) => {
      socket.emit('activity_ack', { timestamp: Date.now() });
    });

    // Task status update broadcast
    socket.on('task_status_change', (data) => {
      io.to(`project:${data.projectId}`).emit('task_updated', {
        ...data,
        updatedBy: socket.userId,
        timestamp: new Date().toISOString()
      });
    });

    // Typing indicator for task comments
    socket.on('typing_start', (data) => {
      socket.to(`project:${data.projectId}`).emit('user_typing', {
        userId: socket.userId,
        taskId: data.taskId
      });
    });

    socket.on('typing_stop', (data) => {
      socket.to(`project:${data.projectId}`).emit('user_stopped_typing', {
        userId: socket.userId,
        taskId: data.taskId
      });
    });

    socket.on('disconnect', (reason) => {
      logger.info(`Socket disconnected: ${socket.id} (reason: ${reason})`);
    });

    socket.on('error', (error) => {
      logger.error(`Socket error for ${socket.id}:`, error);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) throw new Error('Socket.IO not initialized');
  return io;
};

const emitToUser = (userId, event, data) => {
  if (io) {
    io.to(`user:${userId}`).emit(event, data);
  }
};

const emitToProject = (projectId, event, data) => {
  if (io) {
    io.to(`project:${projectId}`).emit(event, data);
  }
};

const broadcastToAll = (event, data) => {
  if (io) {
    io.emit(event, data);
  }
};

module.exports = { initializeSocket, getIO, emitToUser, emitToProject, broadcastToAll };
