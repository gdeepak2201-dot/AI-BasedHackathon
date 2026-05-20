import React from 'react';
import { useQuery } from 'react-query';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FolderKanban, Users, AlertTriangle, Calendar, Brain, TrendingUp, ArrowRight, Activity, DollarSign } from 'lucide-react';
import { dashboardAPI, aiAPI } from '../services/api';
import { useAuthStore } from '../store/authStore';
import StatCard from '../components/ui/StatCard';
import RiskBadge from '../components/ui/RiskBadge';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import clsx from 'clsx';

const COLORS = ['#6366f1', '#3b82f6', '#f59e0b', '#10b981', '#ef4444'];

export default function ManagerDashboard() {
  const { user } = useAuthStore();

  const { data: dashData, isLoading } = useQuery('manager-dashboard', () => dashboardAPI.manager().then(r => r.data), { refetchInterval: 60000 });
  const { data: burnoutData } = useQuery('team-burnout', () => aiAPI.teamBurnout().then(r => r.data.teamBurnout));
  const { data: orgInsights } = useQuery('org-insights', () => aiAPI.orgInsights().then(r => r.data.insights));

  const projectStats = dashData?.projectStats;
  const teamStats = dashData?.teamStats;
  const leaveStats = dashData?.leaveStats;
  const taskDist = dashData?.taskDistribution || [];

  const pieData = taskDist.map(t => ({
    name: t.status?.replace('_', ' '),
    value: parseInt(t.count)
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Manager Overview</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Team performance and AI insights at a glance
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/projects" className="btn-secondary">
            <FolderKanban size={16} /> Projects
          </Link>
          <Link to="/ai-insights" className="btn-primary">
            <Brain size={16} /> AI Insights
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Active Projects" value={projectStats?.active || 0} icon={FolderKanban} color="primary" loading={isLoading} />
        <StatCard title="Team Members" value={teamStats?.team_size || 0} icon={Users} color="violet" loading={isLoading} />
        <StatCard title="Pending Leaves" value={leaveStats?.pending_leaves || 0} icon={Calendar} color="amber" loading={isLoading} />
        <StatCard title="On Leave Today" value={leaveStats?.on_leave_today || 0} icon={Calendar} color="red" loading={isLoading} />
      </div>

      {/* Burnout alerts */}
      {dashData?.burnoutAlerts?.length > 0 && (
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <AlertTriangle size={18} className="text-orange-500" />
              Burnout Risk Alerts
            </h2>
            <Link to="/burnout-monitor" className="text-xs text-primary-600 dark:text-primary-400 hover:underline">
              View all →
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {dashData.burnoutAlerts.map(emp => (
              <div key={emp.id} className="flex items-center gap-3 p-3 bg-orange-50 dark:bg-orange-900/10 rounded-xl border border-orange-200 dark:border-orange-800/30">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                  {emp.first_name?.[0]}{emp.last_name?.[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                    {emp.first_name} {emp.last_name}
                  </p>
                  <RiskBadge level={emp.burnout_risk_score > 0.75 ? 'Critical' : 'High'} score={emp.burnout_risk_score} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Task distribution */}
        <div className="glass-card p-5">
          <h2 className="font-semibold text-slate-900 dark:text-white mb-4">Task Distribution</h2>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                  {pieData.map((_, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value, name) => [value, name]} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-slate-400 text-sm">No task data</div>
          )}
          <div className="flex flex-wrap gap-2 mt-2">
            {pieData.map((item, i) => (
              <div key={i} className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                {item.name} ({item.value})
              </div>
            ))}
          </div>
        </div>

        {/* Team productivity */}
        <div className="glass-card p-5">
          <h2 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <Activity size={16} className="text-primary-500" />
            Team Productivity
          </h2>
          <div className="space-y-4">
            <div className="text-center">
              <div className="text-4xl font-bold gradient-text">
                {Math.round((parseFloat(teamStats?.avg_productivity) || 0) * 100)}%
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Average today</p>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">Active Tasks</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{teamStats?.active_tasks || 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">Team Size</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{teamStats?.team_size || 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">Overdue Projects</span>
                <span className={clsx('font-semibold', (projectStats?.overdue || 0) > 0 ? 'text-red-500' : 'text-emerald-500')}>
                  {projectStats?.overdue || 0}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* AI Org Insights */}
        <div className="glass-card p-5">
          <h2 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <Brain size={16} className="text-violet-500" />
            AI Org Insights
          </h2>
          {orgInsights?.riskAlerts?.length > 0 ? (
            <div className="space-y-3">
              {orgInsights.riskAlerts.slice(0, 3).map((alert, i) => (
                <div key={i} className={clsx('p-3 rounded-xl text-xs', {
                  'bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/30': alert.severity === 'critical',
                  'bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800/30': alert.severity === 'high',
                  'bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800/30': alert.severity === 'medium'
                })}>
                  <p className="font-medium text-slate-800 dark:text-slate-200 capitalize">{alert.type.replace('_', ' ')}</p>
                  <p className="text-slate-600 dark:text-slate-400 mt-0.5">{alert.message}</p>
                </div>
              ))}
              <Link to="/ai-insights" className="text-xs text-primary-600 dark:text-primary-400 hover:underline block text-center">
                View full analysis →
              </Link>
            </div>
          ) : (
            <div className="text-center py-6">
              <Brain size={32} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
              <p className="text-sm text-slate-400">Organization is running smoothly</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Team Chemistry', icon: Users, path: '/team-analytics', color: 'from-primary-500 to-blue-600' },
          { label: 'Burnout Monitor', icon: Activity, path: '/burnout-monitor', color: 'from-orange-500 to-red-600' },
          { label: 'Compensation', icon: DollarSign, path: '/compensation', color: 'from-emerald-500 to-teal-600' },
          { label: 'Leave Requests', icon: Calendar, path: '/leaves', color: 'from-violet-500 to-purple-600' }
        ].map(action => (
          <Link
            key={action.path}
            to={action.path}
            className={`flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r ${action.color} text-white hover:opacity-90 transition-opacity shadow-lg`}
          >
            <action.icon size={20} />
            <span className="text-sm font-medium">{action.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
