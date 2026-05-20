import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { motion } from 'framer-motion';
import { Activity, AlertTriangle, TrendingDown, Users, RefreshCw } from 'lucide-react';
import { aiAPI, timeTrackingAPI } from '../services/api';
import RiskBadge from '../components/ui/RiskBadge';
import StatCard from '../components/ui/StatCard';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LineChart, Line, CartesianGrid, Legend } from 'recharts';
import clsx from 'clsx';

export default function BurnoutMonitor() {
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  const { data: teamBurnout, isLoading, refetch } = useQuery(
    'team-burnout-detail',
    () => aiAPI.teamBurnout().then(r => r.data.teamBurnout),
    { refetchInterval: 300000 }
  );

  const { data: employeeBurnout } = useQuery(
    ['burnout-detail', selectedEmployee],
    () => aiAPI.burnout(selectedEmployee).then(r => r.data.burnout),
    { enabled: !!selectedEmployee }
  );

  const { data: teamActivity } = useQuery(
    'team-activity-today',
    () => timeTrackingAPI.team({}).then(r => r.data),
  );

  const employees = teamBurnout?.employees || [];
  const summary = teamBurnout?.summary || {};

  const riskDistribution = [
    { name: 'Low', value: summary.lowRisk || 0, color: '#10b981' },
    { name: 'Medium', value: summary.mediumRisk || 0, color: '#f59e0b' },
    { name: 'High', value: summary.highRisk || 0, color: '#ef4444' }
  ];

  const activityData = (teamActivity?.teamActivity || []).slice(0, 10).map(emp => ({
    name: `${emp.first_name} ${emp.last_name?.[0]}.`,
    active: Math.round((emp.active_minutes || 0) / 60 * 10) / 10,
    idle: Math.round((emp.idle_minutes || 0) / 60 * 10) / 10,
    overtime: Math.round((emp.overtime_minutes || 0) / 60 * 10) / 10
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Activity className="text-orange-500" size={24} />
            Burnout Monitor
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            AI-powered burnout risk prediction for your team
          </p>
        </div>
        <button onClick={() => refetch()} className="btn-secondary">
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Monitored" value={summary.total || 0} icon={Users} color="primary" loading={isLoading} />
        <StatCard title="High Risk" value={summary.highRisk || 0} icon={AlertTriangle} color="red" loading={isLoading} />
        <StatCard title="Medium Risk" value={summary.mediumRisk || 0} icon={TrendingDown} color="amber" loading={isLoading} />
        <StatCard title="Low Risk" value={summary.lowRisk || 0} icon={Activity} color="emerald" loading={isLoading} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Employee list */}
        <div className="lg:col-span-2 glass-card p-5">
          <h2 className="font-semibold text-slate-900 dark:text-white mb-4">Team Burnout Risk</h2>
          <div className="space-y-3">
            {isLoading ? (
              [1, 2, 3, 4].map(i => <div key={i} className="skeleton h-16 rounded-xl" />)
            ) : employees.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">No employee data available</p>
            ) : (
              employees.map(emp => (
                <motion.div
                  key={emp.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  onClick={() => setSelectedEmployee(emp.id === selectedEmployee ? null : emp.id)}
                  className={clsx(
                    'flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all border',
                    selectedEmployee === emp.id
                      ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 border-transparent'
                  )}
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-violet-500 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                    {emp.first_name?.[0]}{emp.last_name?.[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                      {emp.first_name} {emp.last_name}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{emp.department}</p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-right">
                      <p className="text-xs text-slate-500 dark:text-slate-400">Active Tasks</p>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{emp.active_tasks || 0}</p>
                    </div>
                    <RiskBadge
                      level={
                        (emp.burnout_risk_score || 0) >= 0.75 ? 'Critical' :
                        (emp.burnout_risk_score || 0) >= 0.55 ? 'High' :
                        (emp.burnout_risk_score || 0) >= 0.35 ? 'Moderate' : 'Low'
                      }
                      score={emp.burnout_risk_score}
                    />
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>

        {/* Right panel */}
        <div className="space-y-4">
          {/* Risk distribution */}
          <div className="glass-card p-5">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Risk Distribution</h3>
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={riskDistribution} barSize={40}>
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#94a3b8' }} />
                <YAxis hide />
                <Tooltip />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {riskDistribution.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Selected employee detail */}
          {employeeBurnout && (
            <div className="glass-card p-5">
              <h3 className="font-semibold text-slate-900 dark:text-white mb-3">Risk Breakdown</h3>
              <div className="space-y-2">
                {Object.entries(employeeBurnout.features || {}).map(([key, value]) => (
                  <div key={key}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-500 dark:text-slate-400 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                      <span className="font-medium text-slate-700 dark:text-slate-300">{Math.round(value * 100)}%</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5">
                      <div
                        className={clsx('h-1.5 rounded-full', value > 0.7 ? 'bg-red-500' : value > 0.4 ? 'bg-amber-500' : 'bg-emerald-500')}
                        style={{ width: `${value * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              {employeeBurnout.recommendations?.length > 0 && (
                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/10 rounded-xl">
                  <p className="text-xs font-medium text-blue-700 dark:text-blue-400 mb-1">AI Recommendation</p>
                  <p className="text-xs text-blue-600 dark:text-blue-500">{employeeBurnout.recommendations[0]}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Team activity chart */}
      {activityData.length > 0 && (
        <div className="glass-card p-5">
          <h2 className="font-semibold text-slate-900 dark:text-white mb-4">Today's Team Activity (Hours)</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={activityData} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="active" name="Active" fill="#6366f1" radius={[4, 4, 0, 0]} />
              <Bar dataKey="idle" name="Idle" fill="#94a3b8" radius={[4, 4, 0, 0]} />
              <Bar dataKey="overtime" name="Overtime" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
