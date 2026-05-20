import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import { useNotificationStore } from '../store/notificationStore';

let socket = null;

export const initializeSocket = (token) => {
  if (socket?.connected) return socket;

  socket = io(process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000', {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000
  });

  socket.on('connect', () => {
    console.log('Socket connected:', socket.id);
  });

  socket.on('disconnect', (reason) => {
    console.log('Socket disconnected:', reason);
  });

  socket.on('connect_error', (error) => {
    console.warn('Socket connection error:', error.message);
  });

  // Notification events
  socket.on('notification', (data) => {
    useNotificationStore.getState().addNotification({
      id: Date.now().toString(),
      type: data.type,
      title: data.title,
      message: data.message,
      data: data.data,
      is_read: false,
      created_at: new Date().toISOString()
    });
    toast(data.title, { icon: '🔔' });
  });

  socket.on('task_assigned', (data) => {
    toast.success(`New task assigned: ${data.title}`, { duration: 5000 });
  });

  socket.on('leave_request', (data) => {
    toast(`Leave request from ${data.employeeName}`, { icon: '📋', duration: 5000 });
  });

  socket.on('leave_decision', (data) => {
    if (data.status === 'approved') {
      toast.success(data.message);
    } else {
      toast.error(data.message);
    }
  });

  socket.on('task_postponed', (data) => {
    toast(`Task postponed: ${data.taskTitle}`, { icon: '⚠️', duration: 6000 });
  });

  socket.on('burnout_alert', (data) => {
    toast.error(`Burnout Alert: ${data.employeeName}`, { duration: 8000 });
  });

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const getSocket = () => socket;

export const joinProject = (projectId) => {
  if (socket) socket.emit('join_project', projectId);
};

export const leaveProject = (projectId) => {
  if (socket) socket.emit('leave_project', projectId);
};

export const sendActivityPing = () => {
  if (socket) socket.emit('activity_ping', { timestamp: Date.now() });
};
