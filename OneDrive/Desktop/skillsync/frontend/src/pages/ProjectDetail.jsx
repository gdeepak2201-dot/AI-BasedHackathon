import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { ArrowLeft, Plus, Kanban, Users, Brain, Calendar, Flag } from 'lucide-react';
import { projectsAPI, tasksAPI, aiAPI } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import clsx from 'clsx';

export default function ProjectDetail() {
  const { id } = useParams();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const isManager = ['manager', 'admin'].includes(user?.role);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskForm, setTaskForm] = useState({ title: '', description: '', priority: 'medium', deadline: '', skillTags: '', estimatedHours: '' });

  const { data: projectData, isLoading } = useQuery(['project', id], () => projectsAPI.get(id).then(r => r.data.project));
  const { data: tasksData } = useQuery(['project-tasks', id], () => projectsAPI.getTasks(id).then(r => r.data.tasks));
  const { data: chemistryData } = useQuery(['team-chemistry', id], () => aiAPI.teamChemistry(id).then(r => r.data.chemistry), { enabled: isManager });

  const createTaskMutation = useMutation(
    (data) => tasksAPI.create({ ...data, projectId: id }),
    {
      onSuccess: () => {
        toast.success('Task created');
        queryClient.invalidateQueries(['project-tasks', id]);
        setShowTaskForm(false);
        setTaskForm({ title: '', description: '', priority: 'medium', deadline: '', skillTags: '', estimatedHours: '' });
      },
      onError: (err) => toast.error(err.response?.data?.error || 'Failed to create task')
    }
  );

  const project = projectData;
  const tasks = tasksData || [];

  const tasksByStatus = {
    pending: tasks.filter(t => t.status === 'pending'),
    in_progress: tasks.filter(t => t.status === 'in_progress'),
    review: tasks.filter(t => t.status === 'review'),
    completed: tasks.filter(t => t.status === 'completed')
  };

  const handleCreateTask = (e) => {
    e.preventDefault();
    createTaskMutation.mutate({
      ...taskForm,
      skillTags: taskForm.skillTags.split(',').map(s => s.trim()).filter(Boolean),
      estimatedHours: taskForm.estimatedHours ? parseFloat(taskForm.estimatedHours) : undefined
    });
  };

  if (isLoading) return <div className="space-y-4">{[1, 2, 3].map(i => <div key={i} className="skeleton h-24 rounded-2xl" />)}</div>;
  if (!project) return <div className="text-center py-16 text-slate-400">Project not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/projects" className="btn-secondary"><ArrowLeft size={16} /> Back</Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{project.title}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">{project.description}</p>
        </div>
        <Link to={`/projects/${id}/kanban`} className="btn-primary"><Kanban size={16} /> Kanban Board</Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Project info */}
        <div className="space-y-4">
          <div className="glass-card p-5">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Project Info</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Manager</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">{project.manager_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Status</span>
                <span className="badge badge-in_progress capitalize">{project.status}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Priority</span>
                <span className={clsx('badge', `badge-${project.priority}`)}>{project.priority}</span>
              </div>
              {project.deadline && (
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Deadline</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">{format(new Date(project.deadline), 'MMM d, yyyy')}</span>
                </div>
              )}
            </div>
          </div>

          {/* Team members */}
          <div className="glass-card p-5">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
              <Users size={16} className="text-primary-500" />
              Team ({project.members?.length || 0})
            </h3>
            <div className="space-y-2">
              {project.members?.map(member => (
                <div key={member.id} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-violet-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {member.name?.[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{member.name}</p>
                    <p className="text-xs text-slate-400 capitalize">{member.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Team chemistry */}
          {isManager && chemistryData && (
            <div className="glass-card p-5">
              <h3 className="font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                <Brain size={16} className="text-violet-500" />
                Team Chemistry
              </h3>
              <div className="text-center mb-3">
                <div className="text-3xl font-bold gradient-text">{Math.round((chemistryData.chemistryScore || 0) * 100)}%</div>
                <p className="text-sm text-slate-500 dark:text-slate-400">{chemistryData.chemistryLevel}</p>
              </div>
              {chemistryData.recommendations?.map((rec, i) => (
                <p key={i} className="text-xs text-slate-500 dark:text-slate-400 mt-1">• {rec}</p>
              ))}
            </div>
          )}
        </div>

        {/* Tasks */}
        <div className="lg:col-span-2 space-y-4">
          {isManager && (
            <div className="flex justify-between items-center">
              <h2 className="font-semibold text-slate-900 dark:text-white">Tasks ({tasks.length})</h2>
              <button onClick={() => setShowTaskForm(!showTaskForm)} className="btn-primary text-sm">
                <Plus size={14} /> Add Task
              </button>
            </div>
          )}

          {showTaskForm && (
            <div className="glass-card p-5">
              <form onSubmit={handleCreateTask} className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <input type="text" value={taskForm.title} onChange={e => setTaskForm({ ...taskForm, title: e.target.value })} required placeholder="Task title *" className="input" />
                </div>
                <div className="col-span-2">
                  <textarea value={taskForm.description} onChange={e => setTaskForm({ ...taskForm, description: e.target.value })} placeholder="Description" rows={2} className="input resize-none" />
                </div>
                <select value={taskForm.priority} onChange={e => setTaskForm({ ...taskForm, priority: e.target.value })} className="input">
                  {['low', 'medium', 'high', 'critical'].map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                <input type="date" value={taskForm.deadline} onChange={e => setTaskForm({ ...taskForm, deadline: e.target.value })} className="input" />
                <input type="text" value={taskForm.skillTags} onChange={e => setTaskForm({ ...taskForm, skillTags: e.target.value })} placeholder="Skill tags (comma-separated)" className="input" />
                <input type="number" value={taskForm.estimatedHours} onChange={e => setTaskForm({ ...taskForm, estimatedHours: e.target.value })} placeholder="Estimated hours" className="input" />
                <div className="col-span-2 flex gap-2">
                  <button type="submit" disabled={createTaskMutation.isLoading} className="btn-primary">Create Task</button>
                  <button type="button" onClick={() => setShowTaskForm(false)} className="btn-secondary">Cancel</button>
                </div>
              </form>
            </div>
          )}

          {/* Task list by status */}
          {Object.entries(tasksByStatus).map(([status, statusTasks]) => statusTasks.length > 0 && (
            <div key={status} className="glass-card overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <h3 className="font-medium text-slate-700 dark:text-slate-300 capitalize text-sm">{status.replace('_', ' ')}</h3>
                <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-full">{statusTasks.length}</span>
              </div>
              <div className="divide-y divide-slate-50 dark:divide-slate-800/50">
                {statusTasks.map(task => (
                  <div key={task.id} className="px-5 py-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <div className={clsx('w-2 h-2 rounded-full flex-shrink-0', { 'bg-red-500': task.priority === 'critical', 'bg-orange-500': task.priority === 'high', 'bg-yellow-500': task.priority === 'medium', 'bg-green-500': task.priority === 'low' })} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{task.title}</p>
                      {task.skill_tags?.length > 0 && (
                        <div className="flex gap-1 mt-0.5">
                          {task.skill_tags.slice(0, 3).map(tag => (
                            <span key={tag} className="text-xs text-primary-600 dark:text-primary-400">{tag}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {task.assignees?.slice(0, 2).map((a, i) => (
                        <div key={i} className="w-6 h-6 rounded-full bg-gradient-to-br from-primary-400 to-violet-500 flex items-center justify-center text-white text-xs font-bold">
                          {a.name?.[0]}
                        </div>
                      ))}
                      {task.deadline && <span className="text-xs text-slate-400">{format(new Date(task.deadline), 'MMM d')}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
