import React from 'react';
import { useQuery } from 'react-query';
import { Link } from 'react-router-dom';
import { Shield, Users, FolderKanban, Activity, Brain, TrendingUp } from 'lucide-react';
import { dashboardAPI } from '../services/api';
import StatCard from '../components/ui/StatCard';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function AdminDashboard() {
  const { data: adminData, isLoading } = useQuery('admin-dashboard', () => dashboardAPI.admin().then(r => r.data));

  const orgStats = adminData?.orgStats;
  const deptStats = adminData?.deptStats || [];
  const aiStats = adminData?.aiAgentStats || [];

  const agentColors = ['#6366f1', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#ec4899'];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
          <Shield size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Admin Panel</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">System-wide overview and controls</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard title="Total Employees" value={orgStats?.total_employees || 0} icon={Users} color="primary" loading={isLoading} />
        <StatCard title="Active Projects" value={orgStats?.active_projects || 0} icon={FolderKanban} color="violet" loading={isLoading} />
        <StatCard title="Tasks In Progress" value={orgStats?.tasks_in_progress || 0} icon={Activity} color="blue" loading={isLoading} />
        <StatCard title="Pending Leaves" value={orgStats?.pending_leaves || 0} icon={Activity} color="amber" loading={isLoading} />
        <StatCard title="Avg Burnout Risk" value={`${Math.round((parseFloat(orgStats?.avg_burnout_risk) || 0) * 100)}%`} icon={TrendingUp} color="red" loading={isLoading} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Department stats */}
        <div className="glass-card p-5">
          <h2 className="font-semibold text-slate-900 dark:text-white mb-4">Department Overview</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={deptStats} barSize={30}>
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <YAxis hide />
              <Tooltip />
              <Bar dataKey="employee_count" name="Employees" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* AI Agent performance */}
        <div className="glass-card p-5">
          <h2 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <Brain size={18} className="text-violet-500" />
            AI Agent Performance (7 days)
          </h2>
          <div className="space-y-3">
            {aiStats.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">No agent activity recorded</p>
            ) : (
              aiStats.map((agent, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: agentColors[i % agentColors.length] }} />
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-slate-700 dark:text-slate-300 capitalize">{agent.agent_name?.replace('_', ' ')}</span>
                      <span className="text-slate-500 dark:text-slate-400">{agent.executions} runs</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5">
                      <div className="h-1.5 rounded-full" style={{ width: `${(agent.successes / agent.executions) * 100}%`, backgroundColor: agentColors[i % agentColors.length] }} />
                    </div>
                  </div>
                  <span className="text-xs text-slate-400 flex-shrink-0">{Math.round(agent.avg_time)}ms</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'AI Insights', path: '/ai-insights', color: 'from-violet-500 to-purple-600', icon: Brain },
          { label: 'Burnout Monitor', path: '/burnout-monitor', color: 'from-orange-500 to-red-600', icon: Activity },
          { label: 'Team Analytics', path: '/team-analytics', color: 'from-primary-500 to-blue-600', icon: Users },
          { label: 'Compensation', path: '/compensation', color: 'from-emerald-500 to-teal-600', icon: TrendingUp }
        ].map(item => (
          <Link key={item.path} to={item.path} className={`flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r ${item.color} text-white hover:opacity-90 transition-opacity shadow-lg`}>
            <item.icon size={20} />
            <span className="text-sm font-medium">{item.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
