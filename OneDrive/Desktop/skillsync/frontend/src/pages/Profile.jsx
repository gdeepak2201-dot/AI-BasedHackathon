import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { User, Edit2, Save, X, Camera } from 'lucide-react';
import { usersAPI, aiAPI } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function Profile() {
  const { user, updateUser } = useAuthStore();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ firstName: user?.firstName || '', lastName: user?.lastName || '', phone: '', skills: '' });

  const { data: profileData } = useQuery(['profile', user?.id], () => usersAPI.get(user?.id).then(r => r.data.user), { enabled: !!user?.id });
  const { data: workloadData } = useQuery(['workload', user?.id], () => usersAPI.workload(user?.id).then(r => r.data), { enabled: !!user?.id });

  const updateMutation = useMutation(
    (data) => usersAPI.update(user?.id, data),
    {
      onSuccess: (res) => {
        toast.success('Profile updated');
        updateUser({ firstName: res.data.user.first_name, lastName: res.data.user.last_name });
        queryClient.invalidateQueries(['profile', user?.id]);
        setEditing(false);
      },
      onError: () => toast.error('Failed to update profile')
    }
  );

  const handleSave = () => {
    updateMutation.mutate({
      firstName: form.firstName,
      lastName: form.lastName,
      phone: form.phone,
      skills: form.skills ? form.skills.split(',').map(s => s.trim()).filter(Boolean) : undefined
    });
  };

  const profile = profileData;

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">My Profile</h1>

      <div className="glass-card p-6">
        <div className="flex items-start gap-6">
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-400 to-violet-500 flex items-center justify-center text-white text-2xl font-bold">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
          </div>

          <div className="flex-1">
            {editing ? (
              <div className="grid grid-cols-2 gap-3">
                <input type="text" value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} placeholder="First name" className="input" />
                <input type="text" value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} placeholder="Last name" className="input" />
                <input type="text" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="Phone" className="input" />
                <input type="text" value={form.skills} onChange={e => setForm({ ...form, skills: e.target.value })} placeholder="Skills (comma-separated)" className="input" />
                <div className="col-span-2 flex gap-2">
                  <button onClick={handleSave} disabled={updateMutation.isLoading} className="btn-primary"><Save size={14} /> Save</button>
                  <button onClick={() => setEditing(false)} className="btn-secondary"><X size={14} /> Cancel</button>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">{user?.firstName} {user?.lastName}</h2>
                  <button onClick={() => setEditing(true)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 transition-colors">
                    <Edit2 size={14} />
                  </button>
                </div>
                <p className="text-slate-500 dark:text-slate-400">{user?.email}</p>
                <div className="flex items-center gap-3 mt-2">
                  <span className="badge bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400 capitalize">{user?.role}</span>
                  {profile?.department && <span className="text-sm text-slate-500 dark:text-slate-400">{profile.department}</span>}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
          <div className="text-center">
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{profile?.total_tasks || 0}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Total Tasks</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-emerald-600">{profile?.completed_tasks || 0}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Completed</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-amber-600">{parseFloat(profile?.avg_peer_score || 0).toFixed(1)}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Avg Peer Score</p>
          </div>
        </div>
      </div>

      {/* Skills */}
      {profile?.skills?.length > 0 && (
        <div className="glass-card p-5">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-3">Skills</h3>
          <div className="flex flex-wrap gap-2">
            {profile.skills.map(skill => (
              <span key={skill} className="badge bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400">{skill}</span>
            ))}
          </div>
        </div>
      )}

      {/* Active tasks */}
      {workloadData?.activeTasks?.length > 0 && (
        <div className="glass-card p-5">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-3">Active Tasks ({workloadData.activeTasks.length})</h3>
          <div className="space-y-2">
            {workloadData.activeTasks.slice(0, 5).map(task => (
              <div key={task.id} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${task.priority === 'critical' ? 'bg-red-500' : task.priority === 'high' ? 'bg-orange-500' : 'bg-yellow-500'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{task.title}</p>
                  <p className="text-xs text-slate-400">{task.project_title}</p>
                </div>
                <span className="badge badge-in_progress text-xs">{task.status?.replace('_', ' ')}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
