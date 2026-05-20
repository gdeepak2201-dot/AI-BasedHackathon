import React, { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { useAuthStore } from '../../store/authStore';
import { initializeSocket, disconnectSocket } from '../../services/socket';
import { notificationsAPI } from '../../services/api';
import { useNotificationStore } from '../../store/notificationStore';

export default function Layout() {
  const { user, accessToken } = useAuthStore();
  const { setNotifications } = useNotificationStore();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    if (accessToken) {
      initializeSocket(accessToken);
    }
    return () => disconnectSocket();
  }, [accessToken]);

  useEffect(() => {
    const loadNotifications = async () => {
      try {
        const res = await notificationsAPI.list({ limit: 20 });
        setNotifications(res.data.notifications || []);
      } catch (err) { /* ignore */ }
    };
    loadNotifications();
  }, []);

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        <main className="flex-1 overflow-y-auto p-6 scrollbar-thin">
          <div className="max-w-7xl mx-auto animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
