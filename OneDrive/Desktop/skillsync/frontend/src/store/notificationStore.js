import { create } from 'zustand';

export const useNotificationStore = create((set, get) => ({
  notifications: [],
  unreadCount: 0,

  setNotifications: (notifications) => set({
    notifications,
    unreadCount: notifications.filter(n => !n.is_read).length
  }),

  addNotification: (notification) => set(state => ({
    notifications: [notification, ...state.notifications],
    unreadCount: state.unreadCount + 1
  })),

  markAsRead: (id) => set(state => ({
    notifications: state.notifications.map(n => n.id === id ? { ...n, is_read: true } : n),
    unreadCount: Math.max(0, state.unreadCount - 1)
  })),

  markAllAsRead: () => set(state => ({
    notifications: state.notifications.map(n => ({ ...n, is_read: true })),
    unreadCount: 0
  })),

  removeNotification: (id) => set(state => ({
    notifications: state.notifications.filter(n => n.id !== id),
    unreadCount: state.notifications.find(n => n.id === id && !n.is_read)
      ? state.unreadCount - 1
      : state.unreadCount
  }))
}));
