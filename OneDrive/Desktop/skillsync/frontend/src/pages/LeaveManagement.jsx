import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Plus, Check, X, AlertTriangle, RefreshCw, ChevronDown } from 'lucide-react';
import { leavesAPI } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const statusColors = {
  pending: 'badge-pending',
  approved: 'badge-completed',
  rejected: 'badge-critical'
};

const leaveTypes = ['annual', 'sick', 'personal', 'emergency', 'unpaid'];

export default function LeaveManagement() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const isManager = ['manager', 'admin'].includes(user?.role);
  const [showForm, setShowForm] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [form, setForm] = useState({ leaveType: 'annual', startDate: '', endDate: '', reason: '' });

  const { data: leavesData, isLoading } = useQuery(
    'leaves',
    () => leavesAPI.list({}).then(r => r.data),
    { refetchInterval: 30000 }
  );

  const { data: redistributions } = useQuery(
    ['redistributions', selectedLeave],
    () => leavesAPI.getRedistributions(selectedLeave).then(r => r.data),
    { enabled: !!selectedLeave && isManager }
  );

  const createMutation = useMutation(
    (data) => leavesAPI.create(data),
    {
      onSuccess: () => {
        toast.success('Leave request submitted');
        queryClient.invalidateQueries('leaves');
        setShowForm(false);
        setForm({ leaveType: 'annual', startDate: '', endDate: '', reason: '' });
      },
      onError: (err) => toast.error(err.response?.data?.error || 'Failed to submit leave')
    }
  );

  const approveMutation = useMutation(
    ({ id, action, rejectionReason }) => leavesAPI.approve(id, { action, rejectionReason }),
    {
      onSuccess: (_, vars) => {
        toast.success(`Leave ${vars.action}d successfully`);
        queryClient.invalidateQueries('leaves');
      },
      onError: (err) => toast.error(err.response?.data?.error || 'Action failed')
    }
  );

  const respondMutation = useMutation(
    ({ id, action, reason }) => leavesAPI.respondToRedistribution(id, { action, reason }),
    {
      onSuccess: (_, vars) => {
        toast.success(`Task ${vars.action}ed`);
        queryClient.invalidateQueries(['redistributions', selectedLeave]);
      }
    }
  );

  const leaves = leavesData?.leaves || [];

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate(form);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Calendar className="text-primary-500" size={24} />
            Leave Management
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            {isManager ? 'Manage team leave requests and AI redistribution' : 'Apply for leave and track your requests'}
          </p>
        </div>
        {!isManager && (
          <button onClick={() => setShowForm(!showForm)} className="btn-primary">
            <Plus size={16} /> Apply for Leave
          </button>
        )}
      </div>

      {/* Leave application form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="glass-card p-5 overflow-hidden"
          >
            <h2 className="font-semibold text-slate-900 dark:text-white mb-4">New Leave Request</h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Leave Type</label>
                <select
                  value={form.leaveType}
                  onChange={e => setForm({ ...form, leaveType: e.target.value })}
                  className="input"
                >
                  {leaveTypes.map(t => (
                    <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Start Date</label>
                  <input type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} required className="input" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">End Date</label>
                  <input type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} required className="input" />
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Reason</label>
                <textarea
                  value={form.reason}
                  onChange={e => setForm({ ...form, reason: e.target.value })}
                  placeholder="Please provide a reason for your leave request..."
                  required
                  rows={3}
                  className="input resize-none"
                />
              </div>
              <div className="md:col-span-2 flex gap-3">
                <button type="submit" disabled={createMutation.isLoading} className="btn-primary">
                  {createMutation.isLoading ? 'Submitting...' : 'Submit Request'}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Leaves list */}
      <div className="glass-card overflow-hidden">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800">
          <h2 className="font-semibold text-slate-900 dark:text-white">
            {isManager ? 'All Leave Requests' : 'My Leave Requests'}
          </h2>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {isLoading ? (
            [1, 2, 3].map(i => <div key={i} className="p-4"><div className="skeleton h-16 rounded-xl" /></div>)
          ) : leaves.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <Calendar size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">No leave requests found</p>
            </div>
          ) : (
            leaves.map(leave => (
              <div key={leave.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    {isManager && (
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-0.5">
                        {leave.employee_name}
                        <span className="text-xs text-slate-400 font-normal ml-2">{leave.department_name}</span>
                      </p>
                    )}
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="badge bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 capitalize">
                        {leave.leave_type}
                      </span>
                      <span className="text-sm text-slate-600 dark:text-slate-400">
                        {format(new Date(leave.start_date), 'MMM d')} – {format(new Date(leave.end_date), 'MMM d, yyyy')}
                      </span>
                      <span className={clsx('badge', statusColors[leave.status])}>{leave.status}</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">{leave.reason}</p>
                    {leave.ai_impact_analysis?.totalAffectedTasks > 0 && (
                      <div className="flex items-center gap-1 mt-1">
                        <AlertTriangle size={12} className="text-amber-500" />
                        <span className="text-xs text-amber-600 dark:text-amber-400">
                          {leave.ai_impact_analysis.totalAffectedTasks} tasks affected
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {isManager && leave.status === 'pending' && (
                      <>
                        <button
                          onClick={() => approveMutation.mutate({ id: leave.id, action: 'approve' })}
                          className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 transition-colors"
                          title="Approve"
                        >
                          <Check size={16} />
                        </button>
                        <button
                          onClick={() => {
                            const reason = prompt('Rejection reason:');
                            if (reason) approveMutation.mutate({ id: leave.id, action: 'reject', rejectionReason: reason });
                          }}
                          className="p-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 transition-colors"
                          title="Reject"
                        >
                          <X size={16} />
                        </button>
                      </>
                    )}
                    {isManager && leave.status === 'approved' && (
                      <button
                        onClick={() => setSelectedLeave(selectedLeave === leave.id ? null : leave.id)}
                        className="btn-secondary text-xs"
                      >
                        Redistribution <ChevronDown size={14} className={clsx('transition-transform', selectedLeave === leave.id && 'rotate-180')} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Redistribution panel */}
                <AnimatePresence>
                  {selectedLeave === leave.id && redistributions && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800"
                    >
                      <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                        AI Task Redistribution Plan
                      </h4>
                      {redistributions.redistributions?.length === 0 ? (
                        <p className="text-xs text-slate-400">No redistribution needed</p>
                      ) : (
                        <div className="space-y-2">
                          {redistributions.redistributions?.map(r => (
                            <div key={r.id} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-sm">
                              <div className="flex-1">
                                <p className="font-medium text-slate-800 dark:text-slate-200">{r.task_title}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                  → {r.suggested_assignee_name} • Confidence: {Math.round((r.ai_confidence_score || 0) * 100)}%
                                </p>
                              </div>
                              <span className={clsx('badge', {
                                'badge-pending': r.status === 'pending',
                                'badge-completed': r.status === 'accepted',
                                'badge-critical': r.status === 'declined'
                              })}>
                                {r.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
