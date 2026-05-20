import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { DndContext, DragOverlay, closestCorners, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion } from 'framer-motion';
import { Plus, ArrowLeft, Clock, User, Flag } from 'lucide-react';
import { projectsAPI, tasksAPI } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { joinProject, leaveProject } from '../services/socket';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { format } from 'date-fns';

const COLUMNS = [
  { id: 'pending', label: 'Pending', color: 'bg-slate-100 dark:bg-slate-800', headerColor: 'text-slate-600 dark:text-slate-400' },
  { id: 'in_progress', label: 'In Progress', color: 'bg-blue-50 dark:bg-blue-900/10', headerColor: 'text-blue-600 dark:text-blue-400' },
  { id: 'review', label: 'In Review', color: 'bg-amber-50 dark:bg-amber-900/10', headerColor: 'text-amber-600 dark:text-amber-400' },
  { id: 'completed', label: 'Completed', color: 'bg-emerald-50 dark:bg-emerald-900/10', headerColor: 'text-emerald-600 dark:text-emerald-400' }
];

const priorityColors = {
  critical: 'border-l-red-500',
  high: 'border-l-orange-500',
  medium: 'border-l-yellow-500',
  low: 'border-l-green-500'
};

function TaskCard({ task, isDragging }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging: isSortableDragging } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging ? 0.5 : 1
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={clsx(
        'bg-white dark:bg-slate-800 rounded-xl p-3 shadow-sm border-l-4 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow',
        priorityColors[task.priority] || 'border-l-slate-300'
      )}
    >
      <p className="text-sm font-medium text-slate-800 dark:text-slate-200 mb-2 line-clamp-2">{task.title}</p>

      {task.skill_tags?.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {task.skill_tags.slice(0, 2).map(tag => (
            <span key={tag} className="text-xs bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 px-1.5 py-0.5 rounded-md">
              {tag}
            </span>
          ))}
          {task.skill_tags.length > 2 && (
            <span className="text-xs text-slate-400">+{task.skill_tags.length - 2}</span>
          )}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          {task.assignees?.slice(0, 3).map((a, i) => (
            <div key={i} className="w-6 h-6 rounded-full bg-gradient-to-br from-primary-400 to-violet-500 flex items-center justify-center text-white text-xs font-bold -ml-1 first:ml-0 border-2 border-white dark:border-slate-800">
              {a.name?.[0]}
            </div>
          ))}
        </div>
        {task.deadline && (
          <div className="flex items-center gap-1 text-xs text-slate-400">
            <Clock size={10} />
            {format(new Date(task.deadline), 'MMM d')}
          </div>
        )}
      </div>
    </div>
  );
}

export default function KanbanBoard() {
  const { id: projectId } = useParams();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [activeTask, setActiveTask] = useState(null);
  const isManager = ['manager', 'admin'].includes(user?.role);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const { data: projectData } = useQuery(['project', projectId], () => projectsAPI.get(projectId).then(r => r.data.project));
  const { data: tasksData, isLoading } = useQuery(['project-tasks', projectId], () => projectsAPI.getTasks(projectId).then(r => r.data.tasks));

  const updateStatusMutation = useMutation(
    ({ taskId, status }) => tasksAPI.updateStatus(taskId, status),
    {
      onSuccess: () => queryClient.invalidateQueries(['project-tasks', projectId]),
      onError: () => toast.error('Failed to update task status')
    }
  );

  useEffect(() => {
    joinProject(projectId);
    return () => leaveProject(projectId);
  }, [projectId]);

  const tasks = tasksData || [];
  const tasksByStatus = COLUMNS.reduce((acc, col) => {
    acc[col.id] = tasks.filter(t => t.status === col.id);
    return acc;
  }, {});

  const handleDragStart = (event) => {
    const task = tasks.find(t => t.id === event.active.id);
    setActiveTask(task);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over || active.id === over.id) return;

    // Find target column
    const targetColumn = COLUMNS.find(col => col.id === over.id);
    const targetTask = tasks.find(t => t.id === over.id);
    const newStatus = targetColumn?.id || targetTask?.status;

    if (newStatus && newStatus !== tasks.find(t => t.id === active.id)?.status) {
      updateStatusMutation.mutate({ taskId: active.id, status: newStatus });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Link to={`/projects/${projectId}`} className="btn-secondary">
          <ArrowLeft size={16} /> Back
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">{projectData?.title}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Kanban Board</p>
        </div>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 min-h-96">
          {COLUMNS.map(column => (
            <div key={column.id} className={clsx('rounded-2xl p-4 kanban-column', column.color)}>
              <div className="flex items-center justify-between mb-4">
                <h3 className={clsx('font-semibold text-sm', column.headerColor)}>{column.label}</h3>
                <span className="text-xs bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-full font-medium">
                  {tasksByStatus[column.id]?.length || 0}
                </span>
              </div>

              <SortableContext items={tasksByStatus[column.id]?.map(t => t.id) || []} strategy={verticalListSortingStrategy}>
                <div className="space-y-3 min-h-16" id={column.id}>
                  {isLoading ? (
                    [1, 2].map(i => <div key={i} className="skeleton h-24 rounded-xl" />)
                  ) : (
                    tasksByStatus[column.id]?.map(task => (
                      <TaskCard key={task.id} task={task} />
                    ))
                  )}
                </div>
              </SortableContext>
            </div>
          ))}
        </div>

        <DragOverlay>
          {activeTask && (
            <div className={clsx('bg-white dark:bg-slate-800 rounded-xl p-3 shadow-2xl border-l-4 opacity-90', priorityColors[activeTask.priority])}>
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{activeTask.title}</p>
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
