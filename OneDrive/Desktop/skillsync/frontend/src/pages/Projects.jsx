import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, FolderKanban, Users, Calendar, BarChart3, Search, Filter } from 'lucide-react';
import { projectsAPI, usersAPI, departmentsAPI } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const statusColors = {
  planning: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
  active: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  on_hold: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
};

export default function Projects() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const isManager = ['manager', 'admin'].includes(user?.role);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ title: '', description: '', deadline: '', priority: 'medium', memberIds: [] });

  const { data: projectsData, isLoading } = useQuery(
    ['projects', search],
    () => projectsAPI.list({ search, limit: 50 }).then(r => r.data),
    { keepPreviousData: true }
  );

  const { data: usersData } = useQuery('users-list', () => usersAPI.list({ limit: 100 }).then(r => r.data), { enabled: isManager });

  const createMutation = useMutation(
    (data) => projectsAPI.create(data),
    {
      onSuccess: () => {
        toast.success('Project created successfully');
        queryClient.invalidateQueries('projects');
        setShowForm(false);
        setForm({ title: '', description: '', deadline: '', priority: 'medium', memberIds: [] });
      },
      onError: (err) => toast.error(err.response?.data?.error || 'Failed to create project')
    }
  );

  const projects = projectsData?.projects || [];

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate(form);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Projects</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{projects.length} projects</p>
        </div>
        {isManager && (
          <button onClick={() => setShowForm(!showForm)} className="btn-primary">
            <Plus size={16} /> New Project
          </button>
        )}
      </div>

      {/* Create form */}
      {showForm && isManager && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-5">
          <h2 className="font-semibold text-slate-900 dark:text-white mb-4">Create New Project</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Project Title *</label>
              <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required placeholder="Enter project title" className="input" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Description</label>
              <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} placeholder="Project description..." className="input resize-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Deadline</label>
              <input type="date" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })} className="input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Priority</label>
              <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })} className="input">
                {['low', 'medium', 'high', 'critical'].map(p => (
                  <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Team Members</label>
              <div className="flex flex-wrap gap-2 p-3 border border-slate-200 dark:border-slate-700 rounded-xl min-h-12">
                {usersData?.users?.filter(u => u.role === 'employee').map(u => (
                  <label key={u.id} className={clsx('flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer text-sm transition-colors', form.memberIds.includes(u.id) ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600')}>
                    <input type="checkbox" className="hidden" checked={form.memberIds.includes(u.id)} onChange={e => setForm({ ...form, memberIds: e.target.checked ? [...form.memberIds, u.id] : form.memberIds.filter(id => id !== u.id) })} />
                    {u.first_name} {u.last_name}
                  </label>
                ))}
              </div>
            </div>
            <div className="md:col-span-2 flex gap-3">
              <button type="submit" disabled={createMutation.isLoading} className="btn-primary">
                {createMutation.isLoading ? 'Creating...' : 'Create Project'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
            </div>
          </form>
        </motion.div>
      )}

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search projects..." className="input pl-9" />
      </div>

      {/* Projects grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {isLoading ? (
          [1, 2, 3, 4, 5, 6].map(i => <div key={i} className="skeleton h-48 rounded-2xl" />)
        ) : projects.length === 0 ? (
          <div className="col-span-full text-center py-16">
            <FolderKanban size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
            <p className="text-slate-500 dark:text-slate-400">No projects found</p>
          </div>
        ) : (
          projects.map(project => (
            <motion.div key={project.id} initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="glass-card p-5 hover:shadow-xl transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-900 dark:text-white truncate">{project.title}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{project.manager_name}</p>
                </div>
                <span className={clsx('badge ml-2 flex-shrink-0', statusColors[project.status] || statusColors.planning)}>
                  {project.status}
                </span>
              </div>

              {project.description && (
                <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 mb-3">{project.description}</p>
              )}

              <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 mb-4">
                <div className="flex items-center gap-1">
                  <Users size={12} />
                  {project.member_count || 0} members
                </div>
                <div className="flex items-center gap-1">
                  <BarChart3 size={12} />
                  {project.completed_tasks || 0}/{project.task_count || 0} tasks
                </div>
                {project.deadline && (
                  <div className="flex items-center gap-1">
                    <Calendar size={12} />
                    {format(new Date(project.deadline), 'MMM d')}
                  </div>
                )}
              </div>

              {/* Progress bar */}
              <div className="mb-4">
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5">
                  <div
                    className="h-1.5 rounded-full bg-gradient-to-r from-primary-500 to-violet-500 transition-all"
                    style={{ width: `${project.task_count > 0 ? (project.completed_tasks / project.task_count) * 100 : 0}%` }}
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Link to={`/projects/${project.id}`} className="btn-secondary flex-1 justify-center text-xs">
                  Details
                </Link>
                <Link to={`/projects/${project.id}/kanban`} className="btn-primary flex-1 justify-center text-xs">
                  Kanban
                </Link>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
