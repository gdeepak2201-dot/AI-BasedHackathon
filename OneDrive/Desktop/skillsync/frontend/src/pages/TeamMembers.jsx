import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { Search, Filter, Mail, Phone, Briefcase, Award, TrendingUp, AlertTriangle, ChevronDown } from 'lucide-react';
import { usersAPI } from '../services/api';
import { useAuthStore } from '../store/authStore';
import clsx from 'clsx';

export default function TeamMembers() {
  const { user } = useAuthStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDept, setFilterDept] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [expandedId, setExpandedId] = useState(null);

  const { data: usersData, isLoading } = useQuery('all-users', () => usersAPI.list({ limit: 100 }).then(r => r.data), { refetchInterval: 60000 });

  const users = usersData?.users || [];

  // Filter and search
  const filtered = users.filter(u => {
    const matchSearch = u.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       u.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       u.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchDept = filterDept === 'all' || u.department_id === filterDept;
    return matchSearch && matchDept;
  });

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`);
      case 'email':
        return a.email.localeCompare(b.email);
      case 'skills':
        return (b.skills?.length || 0) - (a.skills?.length || 0);
      default:
        return 0;
    }
  });

  const departments = ['all', ...new Set(users.map(u => u.department_id))];

  const getRoleColor = (roleId) => {
    switch (roleId) {
      case 1: return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300';
      case 2: return 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300';
      case 3: return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300';
      default: return 'bg-slate-100 dark:bg-slate-900/30 text-slate-700 dark:text-slate-300';
    }
  };

  const getRoleLabel = (roleId) => {
    switch (roleId) {
      case 1: return 'Employee';
      case 2: return 'Manager';
      case 3: return 'Admin';
      default: return 'User';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Team Members</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Manage and view all team members across departments
          </p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold gradient-text">{sorted.length}</div>
          <p className="text-sm text-slate-500 dark:text-slate-400">Total Members</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="glass-card p-4 space-y-4">
        <div className="flex gap-3 flex-col md:flex-row">
          {/* Search */}
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="name">Sort by Name</option>
            <option value="email">Sort by Email</option>
            <option value="skills">Sort by Skills</option>
          </select>
        </div>
      </div>

      {/* Team Members Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
        </div>
      ) : sorted.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <p className="text-slate-500 dark:text-slate-400">No team members found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sorted.map(member => (
            <div
              key={member.id}
              className="glass-card p-5 hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => setExpandedId(expandedId === member.id ? null : member.id)}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-semibold text-lg flex-shrink-0">
                    {member.first_name?.[0]}{member.last_name?.[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-900 dark:text-white truncate">
                      {member.first_name} {member.last_name}
                    </h3>
                    <span className={clsx('inline-block px-2 py-1 rounded text-xs font-medium mt-1', getRoleColor(member.role_id))}>
                      {getRoleLabel(member.role_id)}
                    </span>
                  </div>
                </div>
                <ChevronDown
                  size={20}
                  className={clsx('text-slate-400 transition-transform', expandedId === member.id && 'rotate-180')}
                />
              </div>

              {/* Contact Info */}
              <div className="space-y-2 mb-4 pb-4 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                  <Mail size={14} />
                  <a href={`mailto:${member.email}`} className="hover:text-primary-500 truncate">
                    {member.email}
                  </a>
                </div>
                {member.phone && (
                  <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                    <Phone size={14} />
                    <span>{member.phone}</span>
                  </div>
                )}
              </div>

              {/* Skills */}
              {member.skills && member.skills.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1">
                    <Award size={14} />
                    Skills ({member.skills.length})
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {member.skills.slice(0, expandedId === member.id ? undefined : 3).map((skill, i) => (
                      <span
                        key={i}
                        className="px-2 py-1 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-xs font-medium"
                      >
                        {skill}
                      </span>
                    ))}
                    {!expandedId && member.skills.length > 3 && (
                      <span className="px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-medium">
                        +{member.skills.length - 3}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Expanded Details */}
              {expandedId === member.id && (
                <div className="pt-4 border-t border-slate-200 dark:border-slate-700 space-y-3 animate-in fade-in">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-slate-500 dark:text-slate-400 text-xs">Hire Date</p>
                      <p className="font-medium text-slate-900 dark:text-white">
                        {member.hire_date ? new Date(member.hire_date).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500 dark:text-slate-400 text-xs">Status</p>
                      <p className={clsx('font-medium', member.is_active !== false ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400')}>
                        {member.is_active !== false ? 'Active' : 'Inactive'}
                      </p>
                    </div>
                  </div>

                  {member.metadata && (
                    <div className="space-y-2 text-sm">
                      {member.metadata.location && (
                        <div>
                          <p className="text-slate-500 dark:text-slate-400 text-xs">Location</p>
                          <p className="font-medium text-slate-900 dark:text-white">{member.metadata.location}</p>
                        </div>
                      )}
                      {member.metadata.timezone && (
                        <div>
                          <p className="text-slate-500 dark:text-slate-400 text-xs">Timezone</p>
                          <p className="font-medium text-slate-900 dark:text-white">{member.metadata.timezone}</p>
                        </div>
                      )}
                    </div>
                  )}

                  <button className="w-full mt-3 px-4 py-2 rounded-lg bg-primary-500 hover:bg-primary-600 text-white font-medium text-sm transition-colors">
                    View Profile
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Stats Footer */}
      <div className="glass-card p-5 grid grid-cols-3 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold gradient-text">{sorted.length}</div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Total Members</p>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {sorted.filter(u => u.is_active !== false).length}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Active</p>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">
            {Math.round((sorted.reduce((sum, u) => sum + (u.skills?.length || 0), 0) / sorted.length) || 0)}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Avg Skills</p>
        </div>
      </div>
    </div>
  );
}
