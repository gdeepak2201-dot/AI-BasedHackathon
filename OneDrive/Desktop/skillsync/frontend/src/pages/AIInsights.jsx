import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { motion } from 'framer-motion';
import { Brain, AlertTriangle, TrendingUp, Users, Building2, Zap, RefreshCw } from 'lucide-react';
import { aiAPI } from '../services/api';
import clsx from 'clsx';

const severityConfig = {
  critical: { bg: 'bg-red-50 dark:bg-red-900/10', border: 'border-red-200 dark:border-red-800/30', text: 'text-red-700 dark:text-red-400', badge: 'bg-red-100 text-red-700' },
  high: { bg: 'bg-orange-50 dark:bg-orange-900/10', border: 'border-orange-200 dark:border-orange-800/30', text: 'text-orange-700 dark:text-orange-400', badge: 'bg-orange-100 text-orange-700' },
  medium: { bg: 'bg-yellow-50 dark:bg-yellow-900/10', border: 'border-yellow-200 dark:border-yellow-800/30', text: 'text-yellow-700 dark:text-yellow-400', badge: 'bg-yellow-100 text-yellow-700' }
};

export default function AIInsights() {
  const [activeTab, setActiveTab] = useState('org');

  const { data: orgInsights, isLoading: orgLoading, refetch: refetchOrg } = useQuery(
    'org-insights-full',
    () => aiAPI.orgInsights().then(r => r.data.insights),
    { refetchInterval: 600000 }
  );

  const { data: compensationData } = useQuery(
    'compensation-team',
    () => aiAPI.compensationTeam().then(r => r.data.suggestions)
  );

  const tabs = [
    { id: 'org', label: 'Org Insights', icon: Building2 },
    { id: 'bottlenecks', label: 'Bottlenecks', icon: AlertTriangle },
    { id: 'compensation', label: 'Compensation AI', icon: TrendingUp },
    { id: 'recommendations', label: 'Recommendations', icon: Zap }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Brain className="text-violet-500" size={24} />
            AI Insights
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Organizational intelligence powered by 6 AI agents
          </p>
        </div>
        <button onClick={() => refetchOrg()} className="btn-secondary">
          <RefreshCw size={16} /> Refresh Analysis
        </button>
      </div>

      {/* AI Agent status */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { name: 'Skill Extraction', color: 'from-blue-500 to-cyan-500', status: 'active' },
          { name: 'Team Chemistry', color: 'from-violet-500 to-purple-500', status: 'active' },
          { name: 'Burnout Prediction', color: 'from-orange-500 to-red-500', status: 'active' },
          { name: 'Leave Impact', color: 'from-emerald-500 to-teal-500', status: 'active' },
          { name: 'Compensation AI', color: 'from-amber-500 to-yellow-500', status: 'active' },
          { name: 'Org Insight', color: 'from-pink-500 to-rose-500', status: 'active' }
        ].map((agent, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
            className="glass-card p-3 text-center"
          >
            <div className={clsx('w-8 h-8 rounded-lg bg-gradient-to-br mx-auto mb-2 flex items-center justify-center', agent.color)}>
              <Brain size={14} className="text-white" />
            </div>
            <p className="text-xs font-medium text-slate-700 dark:text-slate-300 leading-tight">{agent.name}</p>
            <div className="flex items-center justify-center gap-1 mt-1">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs text-emerald-600 dark:text-emerald-400">Active</span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-fit">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={clsx(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
              activeTab === tab.id
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            )}
          >
            <tab.icon size={15} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'org' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Risk alerts */}
          <div className="glass-card p-5">
            <h2 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <AlertTriangle size={18} className="text-orange-500" />
              Risk Alerts
            </h2>
            {orgLoading ? (
              <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="skeleton h-16 rounded-xl" />)}</div>
            ) : orgInsights?.riskAlerts?.length > 0 ? (
              <div className="space-y-3">
                {orgInsights.riskAlerts.map((alert, i) => {
                  const config = severityConfig[alert.severity] || severityConfig.medium;
                  return (
                    <div key={i} className={clsx('p-4 rounded-xl border', config.bg, config.border)}>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className={clsx('text-sm font-semibold capitalize', config.text)}>
                            {alert.type.replace('_', ' ')}
                          </p>
                          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{alert.message}</p>
                        </div>
                        <span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0', config.badge)}>
                          {alert.severity}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/20 flex items-center justify-center mx-auto mb-3">
                  <Zap size={20} className="text-emerald-500" />
                </div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">All Clear</p>
                <p className="text-xs text-slate-400 mt-1">No organizational risks detected</p>
              </div>
            )}
          </div>

          {/* Department workload */}
          <div className="glass-card p-5">
            <h2 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <Building2 size={18} className="text-primary-500" />
              Department Workload
            </h2>
            <div className="space-y-3">
              {orgInsights?.deptWorkload?.map((dept, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-slate-700 dark:text-slate-300">{dept.department}</span>
                      <span className="text-slate-500 dark:text-slate-400">{dept.employee_count} people</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                      <div
                        className={clsx('h-2 rounded-full', (dept.avg_burnout || 0) > 0.6 ? 'bg-red-500' : (dept.avg_burnout || 0) > 0.4 ? 'bg-amber-500' : 'bg-emerald-500')}
                        style={{ width: `${Math.min(100, (dept.active_tasks || 0) / Math.max(1, dept.employee_count) * 20)}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 flex-shrink-0">{dept.active_tasks || 0} tasks</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'bottlenecks' && (
        <div className="glass-card p-5">
          <h2 className="font-semibold text-slate-900 dark:text-white mb-4">Workflow Bottlenecks</h2>
          {orgInsights?.bottlenecks?.length > 0 ? (
            <div className="space-y-3">
              {orgInsights.bottlenecks.map((emp, i) => (
                <div key={i} className="flex items-center gap-4 p-4 bg-orange-50 dark:bg-orange-900/10 rounded-xl border border-orange-200 dark:border-orange-800/30">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {emp.name?.[0]}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{emp.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{emp.department}</p>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-lg font-bold text-slate-800 dark:text-slate-200">{emp.task_count}</p>
                      <p className="text-xs text-slate-400">Total Tasks</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-amber-600">{emp.review_pending}</p>
                      <p className="text-xs text-slate-400">In Review</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-red-600">{emp.overdue}</p>
                      <p className="text-xs text-slate-400">Overdue</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400 text-center py-8">No bottlenecks detected</p>
          )}
        </div>
      )}

      {activeTab === 'compensation' && (
        <div className="glass-card p-5">
          <h2 className="font-semibold text-slate-900 dark:text-white mb-4">AI Compensation Suggestions</h2>
          {compensationData?.length > 0 ? (
            <div className="space-y-4">
              {compensationData.map((suggestion, i) => (
                <div key={i} className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-primary-300 dark:hover:border-primary-700 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-violet-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                        {suggestion.first_name?.[0]}{suggestion.last_name?.[0]}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                          {suggestion.first_name} {suggestion.last_name}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{suggestion.department}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={clsx('badge', {
                        'bg-emerald-100 text-emerald-700': suggestion.suggestion_type === 'promotion',
                        'bg-blue-100 text-blue-700': suggestion.suggestion_type === 'increment',
                        'bg-amber-100 text-amber-700': suggestion.suggestion_type === 'development',
                        'bg-red-100 text-red-700': suggestion.suggestion_type === 'performance_improvement'
                      })}>
                        {suggestion.suggestion_type?.replace('_', ' ')}
                      </span>
                      <p className="text-xs text-slate-400 mt-1">Score: {Math.round((suggestion.overall_score || 0) * 100)}%</p>
                    </div>
                  </div>
                  {suggestion.rationale && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 line-clamp-2">{suggestion.rationale}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400 text-center py-8">No compensation suggestions available</p>
          )}
        </div>
      )}

      {activeTab === 'recommendations' && (
        <div className="glass-card p-5">
          <h2 className="font-semibold text-slate-900 dark:text-white mb-4">AI Recommendations</h2>
          <div className="space-y-3">
            {orgInsights?.recommendations?.map((rec, i) => (
              <div key={i} className="flex items-start gap-3 p-4 bg-primary-50 dark:bg-primary-900/10 rounded-xl">
                <div className="w-6 h-6 rounded-full bg-primary-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5">
                  {i + 1}
                </div>
                <p className="text-sm text-slate-700 dark:text-slate-300">{rec}</p>
              </div>
            ))}
            {(!orgInsights?.recommendations || orgInsights.recommendations.length === 0) && (
              <p className="text-sm text-slate-400 text-center py-8">No recommendations at this time</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
