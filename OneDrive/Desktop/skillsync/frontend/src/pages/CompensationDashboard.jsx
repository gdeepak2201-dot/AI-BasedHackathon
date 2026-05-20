import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { DollarSign, TrendingUp, Award, RefreshCw, Check, X } from 'lucide-react';
import { aiAPI, compensationAPI } from '../services/api';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const suggestionConfig = {
  promotion: { color: 'from-emerald-500 to-teal-600', badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400', icon: '🚀' },
  increment: { color: 'from-blue-500 to-primary-600', badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400', icon: '📈' },
  development: { color: 'from-amber-500 to-orange-600', badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400', icon: '🎯' },
  performance_improvement: { color: 'from-violet-500 to-purple-600', badge: 'bg-violet-100 text-violet-700 dark:bg-violet-900/20 dark:text-violet-400', icon: '💡' }
};

export default function CompensationDashboard() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState('all');

  const { data: suggestions, isLoading, refetch } = useQuery(
    'compensation-suggestions',
    () => compensationAPI.list({}).then(r => r.data.suggestions),
    { refetchInterval: 300000 }
  );

  const reviewMutation = useMutation(
    ({ id, status }) => compensationAPI.review(id, { status }),
    {
      onSuccess: () => {
        toast.success('Review updated');
        queryClient.invalidateQueries('compensation-suggestions');
      }
    }
  );

  const allSuggestions = suggestions || [];
  const filtered = filter === 'all' ? allSuggestions : allSuggestions.filter(s => s.suggestion_type === filter);

  const stats = {
    total: allSuggestions.length,
    promotions: allSuggestions.filter(s => s.suggestion_type === 'promotion').length,
    increments: allSuggestions.filter(s => s.suggestion_type === 'increment').length,
    development: allSuggestions.filter(s => s.suggestion_type === 'development').length
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <DollarSign className="text-emerald-500" size={24} />
            Compensation Intelligence
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">AI-generated performance and compensation recommendations</p>
        </div>
        <button onClick={() => refetch()} className="btn-secondary"><RefreshCw size={16} /> Refresh</button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Reviews', value: stats.total, icon: '📊', color: 'bg-slate-50 dark:bg-slate-800' },
          { label: 'Promotions', value: stats.promotions, icon: '🚀', color: 'bg-emerald-50 dark:bg-emerald-900/10' },
          { label: 'Increments', value: stats.increments, icon: '📈', color: 'bg-blue-50 dark:bg-blue-900/10' },
          { label: 'Development', value: stats.development, icon: '🎯', color: 'bg-amber-50 dark:bg-amber-900/10' }
        ].map((stat, i) => (
          <div key={i} className={clsx('glass-card p-5', stat.color)}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">{stat.label}</p>
                <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">{stat.value}</p>
              </div>
              <span className="text-3xl">{stat.icon}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {['all', 'promotion', 'increment', 'development', 'performance_improvement'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={clsx('px-4 py-2 rounded-xl text-sm font-medium transition-all', filter === f ? 'bg-primary-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:border-primary-300')}
          >
            {f === 'all' ? 'All' : f.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </button>
        ))}
      </div>

      {/* Suggestions list */}
      <div className="space-y-4">
        {isLoading ? (
          [1, 2, 3].map(i => <div key={i} className="skeleton h-32 rounded-2xl" />)
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 glass-card">
            <DollarSign size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
            <p className="text-slate-500 dark:text-slate-400">No compensation suggestions available</p>
            <p className="text-xs text-slate-400 mt-1">Run AI analysis to generate suggestions</p>
          </div>
        ) : (
          filtered.map(suggestion => {
            const config = suggestionConfig[suggestion.suggestion_type] || suggestionConfig.development;
            return (
              <div key={suggestion.id} className="glass-card p-5">
                <div className="flex items-start gap-4">
                  <div className={clsx('w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center text-2xl flex-shrink-0', config.color)}>
                    {config.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold text-slate-900 dark:text-white">
                            {suggestion.first_name} {suggestion.last_name}
                          </p>
                          <span className={clsx('badge', config.badge)}>
                            {suggestion.suggestion_type?.replace('_', ' ')}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{suggestion.department} • {suggestion.role}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-2xl font-bold gradient-text">{Math.round((suggestion.overall_score || 0) * 100)}%</div>
                        <p className="text-xs text-slate-400">Overall Score</p>
                      </div>
                    </div>

                    {/* Score breakdown */}
                    <div className="grid grid-cols-4 gap-3 mt-3">
                      {[
                        { label: 'Performance', value: suggestion.performance_score },
                        { label: 'Productivity', value: suggestion.productivity_score },
                        { label: 'Collaboration', value: suggestion.collaboration_score },
                        { label: 'Innovation', value: suggestion.innovation_score }
                      ].map((score, i) => (
                        <div key={i} className="text-center">
                          <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                            {Math.round((score.value || 0) * 100)}%
                          </div>
                          <div className="text-xs text-slate-400">{score.label}</div>
                          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1 mt-1">
                            <div className="h-1 rounded-full bg-primary-500" style={{ width: `${(score.value || 0) * 100}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>

                    {suggestion.rationale && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 line-clamp-2">{suggestion.rationale}</p>
                    )}

                    {suggestion.status === 'pending' && (
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => reviewMutation.mutate({ id: suggestion.id, status: 'approved' })}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 rounded-lg text-xs font-medium hover:bg-emerald-100 transition-colors"
                        >
                          <Check size={12} /> Approve
                        </button>
                        <button
                          onClick={() => reviewMutation.mutate({ id: suggestion.id, status: 'rejected' })}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg text-xs font-medium hover:bg-red-100 transition-colors"
                        >
                          <X size={12} /> Defer
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
