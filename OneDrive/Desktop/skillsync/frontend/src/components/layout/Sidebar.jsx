import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, FolderKanban, Users, Brain, Activity,
  TrendingUp, Calendar, DollarSign, BarChart3, Network,
  LogOut, Settings, ChevronRight, Zap, Shield
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import clsx from 'clsx';

const navConfig = {
  employee: [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { label: 'My Projects', icon: FolderKanban, path: '/projects' },
    { label: 'Time Tracking', icon: Activity, path: '/time-tracking' },
    { label: 'Peer Reviews', icon: Users, path: '/peer-reviews' },
    { label: 'Leave Requests', icon: Calendar, path: '/leaves' },
    { label: 'Skill Graph', icon: Network, path: '/skill-graph' },
    { label: 'My Profile', icon: Settings, path: '/profile' }
  ],
  manager: [
    { label: 'Overview', icon: LayoutDashboard, path: '/manager' },
    { label: 'Projects', icon: FolderKanban, path: '/projects' },
    { label: 'Team Analytics', icon: BarChart3, path: '/team-analytics' },
    { label: 'AI Insights', icon: Brain, path: '/ai-insights' },
    { label: 'Burnout Monitor', icon: Activity, path: '/burnout-monitor' },
    { label: 'Leave Management', icon: Calendar, path: '/leaves' },
    { label: 'Compensation', icon: DollarSign, path: '/compensation' },
    { label: 'Skill Graph', icon: Network, path: '/skill-graph' },
    { label: 'My Profile', icon: Settings, path: '/profile' }
  ],
  admin: [
    { label: 'Admin Panel', icon: Shield, path: '/admin' },
    { label: 'Projects', icon: FolderKanban, path: '/projects' },
    { label: 'Team Analytics', icon: BarChart3, path: '/team-analytics' },
    { label: 'AI Insights', icon: Brain, path: '/ai-insights' },
    { label: 'Burnout Monitor', icon: Activity, path: '/burnout-monitor' },
    { label: 'Leave Management', icon: Calendar, path: '/leaves' },
    { label: 'Compensation', icon: DollarSign, path: '/compensation' },
    { label: 'Skill Graph', icon: Network, path: '/skill-graph' }
  ]
};

export default function Sidebar({ isOpen, onClose }) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const navItems = navConfig[user?.role] || navConfig.employee;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-20 lg:hidden"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ x: isOpen ? 0 : -280 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="fixed lg:relative z-30 lg:z-auto flex flex-col w-64 h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shadow-xl lg:shadow-none"
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-100 dark:border-slate-800">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-violet-600 flex items-center justify-center shadow-lg">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-slate-900 dark:text-white text-base">SkillSync</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">AI Workforce Platform</p>
          </div>
        </div>

        {/* User info */}
        <div className="px-4 py-3 mx-3 mt-3 rounded-xl bg-gradient-to-r from-primary-50 to-violet-50 dark:from-primary-900/20 dark:to-violet-900/20">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-400 to-violet-500 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
                {user?.firstName} {user?.lastName}
              </p>
              <span className="text-xs text-primary-600 dark:text-primary-400 capitalize font-medium">
                {user?.role}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-thin">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => clsx('nav-item', isActive && 'active')}
              onClick={() => window.innerWidth < 1024 && onClose()}
            >
              <item.icon className="w-4.5 h-4.5 flex-shrink-0" size={18} />
              <span className="flex-1">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
          >
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      </motion.aside>
    </>
  );
}
