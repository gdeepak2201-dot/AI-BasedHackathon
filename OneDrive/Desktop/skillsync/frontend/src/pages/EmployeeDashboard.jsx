import React from 'react';
import { useQuery } from 'react-query';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckSquare, Clock, AlertTriangle, TrendingUp, Calendar, Star, ArrowRight, Activity } from 'lucide-react';
import { dashboardAPI, aiAPI } from '../services/api';
import { useAuthStore } from '../store/authStore';
import StatCard from '../components/ui/StatCard';
import RiskBadge from '../components/ui/RiskBadge';
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';
import { format } from 'date-fns';
import clsx from 'clsx';

const priorityColors = { critical: 'text-red-500', high: 'text-orange-500', medium: 'text-yellow-500', low: 'text-green-500' };
const statusColors = { pending: 'badge-pending', in_progress: 'badge-in_progress', review: 'badge-review', completed: 'badge-completed' };

export default function EmployeeDashboard() {
  const { user } = useAuthStore();

  const { data: dashData, isLoading } = useQuery('employee-dashboard', () => dashboardAPI.employee().then(r => r.data), { refetchInterval: 60000 });
  const { data: burnoutData } = useQuery(['burnout', user?.id], () => aiAPI.burnout(user?.id).then(r => r.data.burnout), { enabled: !!user?.id });
  const { data: skillData } = useQuery(['skills', user?.id], () => aiAPI.skills(user?.id).then(r => r.data.skills), { enabled: !!user?.id });

  const stats = dashData?.taskStats;
  const recentTasks = dashData?.recentTasks || [];
  const timeStats = dashData?.timeStats;

  const radarData = skillData ? [
    { subject: 'Technical', value: Math.round((skillData.declaredSkills?.length || 0) * 10) },
    { subject: 'Collaboration', value: 75 },
    { subject: 'Leadership', value: Math.round((burnoutData?.features?.productivityDrop || 0.3) * 100) },
    { subject: 'Productivity', value: Math.round((parseFloat(timeStats?.avg_productivity) || 0.7) * 100) },
    { subject: 'Reliability', value: 80 }
  ] : [];

  return (
    <div className="space-y-6">
      {/* Welcome header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, {user?.firstName} 👋
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            {format(new Date(), 'EEEE, MMMM d, yyyy')}
          </p>
        </div>
        <Link to="/projects" className="btn-primary">
          View Projects <ArrowRight size={16} />
        </Link>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Active Tasks" value={stats?.in_progress || 0} icon={Activity} color="primary" loading={isLoading} />
        <StatCard title="Pending" value={stats?.pending || 0} icon={Clock} color="amber" loading={isLoading} />
        <StatCard title="In Review" value={stats?.in_review || 0} icon={Star} color="violet" loading={isLoading} />
        <StatCard title="Completed" value={stats?.completed || 0} icon={CheckSquare} color="emerald" loading={isLoading} />
      </div>

      {/* Overdue alert */}
      {stats?.overdue > 0 && (
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl"
        >
          <AlertTriangle size={20} className="text-red-500 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-red-700 dark:text-red-400">
              {stats.overdue} overdue task{stats.overdue > 1 ? 's' : ''}
            </p>
            <p className="text-xs text-red-600 dark:text-red-500">Please review and update your task statuses</p>
          </div>
          <Link to="/projects" className="ml-auto text-xs text-red-600 dark:text-red-400 font-medium hover:underline">
            View →
          </Link>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent tasks */}
        <div className="lg:col-span-2 glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-900 dark:text-white">Upcoming Tasks</h2>
            <Link to="/projects" className="text-xs text-primary-600 dark:text-primary-400 hover:underline">View all</Link>
          </div>
          <div className="space-y-3">
            {recentTasks.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">No active tasks</p>
            ) : (
              recentTasks.map(task => (
                <div key={task.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <div className={clsx('w-2 h-2 rounded-full flex-shrink-0', {
                    'bg-red-500': task.priority === 'critical',
                    'bg-orange-500': task.priority === 'high',
                    'bg-yellow-500': task.priority === 'medium',
                    'bg-green-500': task.priority === 'low'
                  })} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{task.title}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{task.project_title}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={clsx('badge', statusColors[task.status])}>{task.status?.replace('_', ' ')}</span>
                    {task.deadline && (
                      <span className="text-xs text-slate-400">
                        {format(new Date(task.deadline), 'MMM d')}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Burnout risk */}
          {burnoutData && (
            <div className="glass-card p-5">
              <h3 className="font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                <Activity size={16} className="text-primary-500" />
                Wellbeing Score
              </h3>
              <div className="flex items-center justify-between mb-2">
                <RiskBadge level={burnoutData.riskLevel} score={burnoutData.riskScore} />
                <span className="text-2xl font-bold text-slate-900 dark:text-white">
                  {Math.round((1 - burnoutData.riskScore) * 100)}%
                </span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 mb-3">
                <div
                  className={clsx('h-2 rounded-full transition-all', {
                    'bg-emerald-500': burnoutData.riskScore < 0.35,
                    'bg-yellow-500': burnoutData.riskScore >= 0.35 && burnoutData.riskScore < 0.55,
                    'bg-orange-500': burnoutData.riskScore >= 0.55 && burnoutData.riskScore < 0.75,
                    'bg-red-500': burnoutData.riskScore >= 0.75
                  })}
                  style={{ width: `${(1 - burnoutData.riskScore) * 100}%` }}
                />
              </div>
              {burnoutData.recommendations?.[0] && (
                <p className="text-xs text-slate-500 dark:text-slate-400">{burnoutData.recommendations[0]}</p>
              )}
            </div>
          )}

          {/* Skill radar */}
          {radarData.length > 0 && (
            <div className="glass-card p-5">
              <h3 className="font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                <TrendingUp size={16} className="text-violet-500" />
                Performance Radar
              </h3>
              <ResponsiveContainer width="100%" height={180}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <Radar name="Score" dataKey="value" stroke="#6366f1" fill="#6366f1" fillOpacity={0.2} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Today's hours */}
          <div className="glass-card p-5">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
              <Clock size={16} className="text-emerald-500" />
              This Week
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">Active Hours</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {Math.round((parseFloat(timeStats?.total_active_this_week) || 0) / 60 * 10) / 10}h
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">Productivity</span>
                <span className="font-semibold text-emerald-600">
                  {Math.round((parseFloat(timeStats?.avg_productivity) || 0) * 100)}%
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">Overtime</span>
                <span className={clsx('font-semibold', (parseFloat(timeStats?.total_overtime) || 0) > 120 ? 'text-orange-500' : 'text-slate-800 dark:text-slate-200')}>
                  {Math.round((parseFloat(timeStats?.total_overtime) || 0) / 60 * 10) / 10}h
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
