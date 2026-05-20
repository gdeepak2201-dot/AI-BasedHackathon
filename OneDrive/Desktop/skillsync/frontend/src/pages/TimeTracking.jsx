import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { Clock, Activity, TrendingUp, Play, Square } from 'lucide-react';
import { timeTrackingAPI } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { sendActivityPing } from '../services/socket';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function TimeTracking() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [isTracking, setIsTracking] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [elapsed, setElapsed] = useState(0);

  const { data: logsData } = useQuery('my-time-logs', () => timeTrackingAPI.myLogs({ limit: 30 }).then(r => r.data));
  const { data: trendData } = useQuery('productivity-trend', () => timeTrackingAPI.trend({}).then(r => r.data));

  const logMutation = useMutation(
    (data) => timeTrackingAPI.log(data),
    {
      onSuccess: () => {
        toast.success('Activity logged');
        queryClient.invalidateQueries('my-time-logs');
      }
    }
  );

  // Timer
  useEffect(() => {
    let interval;
    if (isTracking) {
      interval = setInterval(() => {
        setElapsed(prev => prev + 1);
        // Send activity ping every 30 seconds
        if (elapsed % 30 === 0) sendActivityPing();
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTracking, elapsed]);

  const handleStartTracking = () => {
    setIsTracking(true);
    setStartTime(new Date());
    setElapsed(0);
    toast.success('Time tracking started');
  };

  const handleStopTracking = () => {
    setIsTracking(false);
    const activeMinutes = Math.floor(elapsed / 60);
    logMutation.mutate({
      date: new Date().toISOString().split('T')[0],
      loginTime: startTime?.toISOString(),
      logoutTime: new Date().toISOString(),
      activeMinutes,
      idleMinutes: Math.floor(activeMinutes * 0.1)
    });
  };

  const formatElapsed = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const logs = logsData?.logs || [];
  const weeklySummary = logsData?.weeklySummary || [];
  const trend = trendData?.trend || [];

  const trendChartData = trend.map(t => ({
    date: format(new Date(t.date), 'MMM d'),
    productivity: Math.round((t.productivity_score || 0) * 100),
    hours: Math.round((t.active_minutes || 0) / 60 * 10) / 10
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Clock className="text-primary-500" size={24} />
          Time Tracking
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Track your active work hours and productivity</p>
      </div>

      {/* Timer */}
      <div className="glass-card p-6 text-center">
        <div className="text-6xl font-mono font-bold text-slate-900 dark:text-white mb-4">
          {formatElapsed(elapsed)}
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
          {isTracking ? '🟢 Tracking active...' : '⚪ Not tracking'}
        </p>
        <button
          onClick={isTracking ? handleStopTracking : handleStartTracking}
          className={isTracking ? 'btn-danger' : 'btn-primary'}
        >
          {isTracking ? <><Square size={16} /> Stop Tracking</> : <><Play size={16} /> Start Tracking</>}
        </button>
      </div>

      {/* Productivity trend */}
      {trendChartData.length > 0 && (
        <div className="glass-card p-5">
          <h2 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <TrendingUp size={18} className="text-primary-500" />
            30-Day Productivity Trend
          </h2>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={trendChartData}>
              <defs>
                <linearGradient id="prodGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <Tooltip />
              <Area type="monotone" dataKey="productivity" name="Productivity %" stroke="#6366f1" fill="url(#prodGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Recent logs */}
      <div className="glass-card overflow-hidden">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800">
          <h2 className="font-semibold text-slate-900 dark:text-white">Recent Activity Logs</h2>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {logs.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <Clock size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">No activity logs yet</p>
            </div>
          ) : (
            logs.slice(0, 10).map(log => (
              <div key={log.id} className="flex items-center gap-4 p-4">
                <div className="text-sm font-medium text-slate-700 dark:text-slate-300 w-24 flex-shrink-0">
                  {format(new Date(log.date), 'MMM d')}
                </div>
                <div className="flex-1 grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-slate-500 dark:text-slate-400 text-xs">Active</p>
                    <p className="font-medium text-slate-800 dark:text-slate-200">{Math.round((log.active_minutes || 0) / 60 * 10) / 10}h</p>
                  </div>
                  <div>
                    <p className="text-slate-500 dark:text-slate-400 text-xs">Idle</p>
                    <p className="font-medium text-slate-800 dark:text-slate-200">{Math.round((log.idle_minutes || 0) / 60 * 10) / 10}h</p>
                  </div>
                  <div>
                    <p className="text-slate-500 dark:text-slate-400 text-xs">Overtime</p>
                    <p className={`font-medium ${(log.overtime_minutes || 0) > 60 ? 'text-orange-500' : 'text-slate-800 dark:text-slate-200'}`}>
                      {Math.round((log.overtime_minutes || 0) / 60 * 10) / 10}h
                    </p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-slate-400">Productivity</p>
                  <p className="text-sm font-semibold text-primary-600 dark:text-primary-400">
                    {Math.round((log.productivity_score || 0) * 100)}%
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
