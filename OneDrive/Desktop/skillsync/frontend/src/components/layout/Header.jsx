import React, { useState, useRef, useEffect } from 'react';
import { Menu, Bell, Sun, Moon, Search, X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useThemeStore } from '../../store/themeStore';
import { useNotificationStore } from '../../store/notificationStore';
import { notificationsAPI } from '../../services/api';
import { formatDistanceToNow } from 'date-fns';
import clsx from 'clsx';

export default function Header({ onMenuClick }) {
  const { isDark, toggleTheme } = useThemeStore();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotificationStore();
  const [showNotifications, setShowNotifications] = useState(false);
  const notifRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkRead = async (id) => {
    try {
      await notificationsAPI.markRead(id);
      markAsRead(id);
    } catch (err) { /* ignore */ }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsAPI.markAllRead();
      markAllAsRead();
    } catch (err) { /* ignore */ }
  };

  const getNotifIcon = (type) => {
    const icons = {
      task_assigned: '📋',
      leave_request: '🗓️',
      leave_decision: '✅',
      burnout_alert: '⚠️',
      redistribution_request: '🔄',
      task_postponed: '⏰',
      project_assigned: '🚀'
    };
    return icons[type] || '🔔';
  };

  return (
    <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 flex-shrink-0">
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="Toggle sidebar"
        >
          <Menu size={20} className="text-slate-600 dark:text-slate-400" />
        </button>

        {/* Search */}
        <div className="hidden md:flex items-center gap-2 bg-slate-100 dark:bg-slate-800 rounded-xl px-3 py-2 w-64">
          <Search size={16} className="text-slate-400" />
          <input
            type="text"
            placeholder="Search projects, tasks..."
            className="bg-transparent text-sm text-slate-700 dark:text-slate-300 placeholder-slate-400 outline-none w-full"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="Toggle theme"
        >
          {isDark
            ? <Sun size={20} className="text-amber-400" />
            : <Moon size={20} className="text-slate-600" />
          }
        </button>

        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Notifications"
          >
            <Bell size={20} className="text-slate-600 dark:text-slate-400" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          <AnimatePresence>
            {showNotifications && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-12 w-96 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 z-50 overflow-hidden"
              >
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                  <h3 className="font-semibold text-slate-900 dark:text-white">Notifications</h3>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-xs text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1"
                    >
                      <Check size={12} /> Mark all read
                    </button>
                  )}
                </div>

                <div className="max-h-96 overflow-y-auto scrollbar-thin">
                  {notifications.length === 0 ? (
                    <div className="py-8 text-center text-slate-400 text-sm">
                      <Bell size={32} className="mx-auto mb-2 opacity-30" />
                      No notifications
                    </div>
                  ) : (
                    notifications.slice(0, 10).map((notif) => (
                      <div
                        key={notif.id}
                        onClick={() => !notif.is_read && handleMarkRead(notif.id)}
                        className={clsx(
                          'flex gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors border-b border-slate-50 dark:border-slate-800/50',
                          !notif.is_read && 'bg-primary-50/50 dark:bg-primary-900/10'
                        )}
                      >
                        <span className="text-xl flex-shrink-0">{getNotifIcon(notif.type)}</span>
                        <div className="flex-1 min-w-0">
                          <p className={clsx('text-sm font-medium truncate', !notif.is_read ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400')}>
                            {notif.title}
                          </p>
                          {notif.message && (
                            <p className="text-xs text-slate-500 dark:text-slate-500 mt-0.5 line-clamp-2">{notif.message}</p>
                          )}
                          <p className="text-xs text-slate-400 mt-1">
                            {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
                          </p>
                        </div>
                        {!notif.is_read && (
                          <div className="w-2 h-2 rounded-full bg-primary-500 flex-shrink-0 mt-1.5" />
                        )}
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
