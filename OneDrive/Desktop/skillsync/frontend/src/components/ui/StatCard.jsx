import React from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';

export default function StatCard({ title, value, subtitle, icon: Icon, trend, color = 'primary', loading }) {
  const colorMap = {
    primary: 'from-primary-500 to-primary-600',
    violet: 'from-violet-500 to-violet-600',
    emerald: 'from-emerald-500 to-emerald-600',
    amber: 'from-amber-500 to-amber-600',
    red: 'from-red-500 to-red-600',
    blue: 'from-blue-500 to-blue-600',
    rose: 'from-rose-500 to-rose-600'
  };

  const bgMap = {
    primary: 'bg-primary-50 dark:bg-primary-900/20',
    violet: 'bg-violet-50 dark:bg-violet-900/20',
    emerald: 'bg-emerald-50 dark:bg-emerald-900/20',
    amber: 'bg-amber-50 dark:bg-amber-900/20',
    red: 'bg-red-50 dark:bg-red-900/20',
    blue: 'bg-blue-50 dark:bg-blue-900/20',
    rose: 'bg-rose-50 dark:bg-rose-900/20'
  };

  if (loading) {
    return (
      <div className="glass-card p-5">
        <div className="skeleton h-4 w-24 mb-3" />
        <div className="skeleton h-8 w-16 mb-2" />
        <div className="skeleton h-3 w-32" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-5 hover:shadow-xl transition-shadow duration-300"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">{title}</p>
          <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">{value}</p>
          {subtitle && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{subtitle}</p>
          )}
          {trend !== undefined && (
            <div className={clsx('flex items-center gap-1 mt-2 text-xs font-medium', trend >= 0 ? 'text-emerald-600' : 'text-red-500')}>
              <span>{trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%</span>
              <span className="text-slate-400">vs last week</span>
            </div>
          )}
        </div>
        {Icon && (
          <div className={clsx('w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0', bgMap[color])}>
            <div className={clsx('w-8 h-8 rounded-lg bg-gradient-to-br flex items-center justify-center', colorMap[color])}>
              <Icon size={16} className="text-white" />
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
