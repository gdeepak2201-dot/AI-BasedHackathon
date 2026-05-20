import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { Users, Brain, TrendingUp, Star } from 'lucide-react';
import { aiAPI, projectsAPI, usersAPI } from '../services/api';
import RiskBadge from '../components/ui/RiskBadge';
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, Tooltip, ZAxis } from 'recharts';

export default function TeamAnalytics() {
  const [selectedProject, setSelectedProject] = useState('');
  const [teamSkills, setTeamSkills] = useState('');
  const [teamSize, setTeamSize] = useState(5);

  const { data: projectsData } = useQuery('projects-list', () => projectsAPI.list({ limit: 50 }).then(r => r.data));
  const { data: chemistryData } = useQuery(['team-chemistry', selectedProject], () => aiAPI.teamChemistry(selectedProject).then(r => r.data.chemistry), { enabled: !!selectedProject });
  const { data: recommendationsData, refetch: fetchRecommendations } = useQuery(
    ['team-recommendations', teamSkills, teamSize],
    () => aiAPI.teamRecommendations({ requiredSkills: teamSkills.split(',').map(s => s.trim()).filter(Boolean), teamSize: parseInt(teamSize) }).then(r => r.data.recommendations),
    { enabled: false }
  );

  const projects = projectsData?.projects || [];

  const radarData = chemistryData ? [
    { subject: 'Chemistry', value: Math.round((chemistryData.chemistryScore || 0) * 100) },
    { subject: 'Skills', value: Math.min(100, (chemistryData.skillCoverage?.totalSkills || 0) * 5) },
    { subject: 'Collaboration', value: 75 },
    { subject: 'Diversity', value: 80 },
    { subject: 'Efficiency', value: 70 }
  ] : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Users className="text-primary-500" size={24} />
          Team Analytics
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">AI-powered team chemistry and composition analysis</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Team Chemistry Analysis */}
        <div className="glass-card p-5">
          <h2 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <Brain size={18} className="text-violet-500" />
            Team Chemistry Analysis
          </h2>
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Select Project</label>
            <select value={selectedProject} onChange={e => setSelectedProject(e.target.value)} className="input">
              <option value="">Choose a project...</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
          </div>

          {chemistryData ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-primary-50 to-violet-50 dark:from-primary-900/20 dark:to-violet-900/20 rounded-xl">
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Chemistry Score</p>
                  <p className="text-3xl font-bold gradient-text">{Math.round((chemistryData.chemistryScore || 0) * 100)}%</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{chemistryData.chemistryLevel}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{chemistryData.teamSize} members</p>
                </div>
              </div>

              <ResponsiveContainer width="100%" height={200}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <Radar dataKey="value" stroke="#6366f1" fill="#6366f1" fillOpacity={0.2} />
                </RadarChart>
              </ResponsiveContainer>

              {chemistryData.conflicts?.length > 0 && (
                <div className="p-3 bg-red-50 dark:bg-red-900/10 rounded-xl">
                  <p className="text-xs font-medium text-red-700 dark:text-red-400 mb-1">Compatibility Concerns</p>
                  {chemistryData.conflicts.map((c, i) => (
                    <p key={i} className="text-xs text-red-600 dark:text-red-500">• Score {c.score?.toFixed(1)} between team members</p>
                  ))}
                </div>
              )}

              {chemistryData.recommendations?.map((rec, i) => (
                <p key={i} className="text-xs text-slate-500 dark:text-slate-400">• {rec}</p>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-400">
              <Brain size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">Select a project to analyze team chemistry</p>
            </div>
          )}
        </div>

        {/* Team Recommendations */}
        <div className="glass-card p-5">
          <h2 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <Star size={18} className="text-amber-500" />
            Optimal Team Builder
          </h2>
          <div className="space-y-3 mb-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Required Skills</label>
              <input type="text" value={teamSkills} onChange={e => setTeamSkills(e.target.value)} placeholder="react, python, leadership..." className="input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Team Size: {teamSize}</label>
              <input type="range" min={2} max={10} value={teamSize} onChange={e => setTeamSize(e.target.value)} className="w-full" />
            </div>
            <button onClick={() => fetchRecommendations()} className="btn-primary w-full justify-center">
              <Brain size={16} /> Get AI Recommendations
            </button>
          </div>

          {recommendationsData && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-400">Skill Coverage</span>
                <span className="font-semibold text-emerald-600">{recommendationsData.coveragePercentage}%</span>
              </div>
              <div className="space-y-2">
                {recommendationsData.recommendedTeam?.map((member, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-violet-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {member.name?.[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{member.name}</p>
                      <p className="text-xs text-slate-400">{member.department}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-semibold text-primary-600 dark:text-primary-400">
                        {Math.round((member.scores?.total || 0) * 100)}%
                      </p>
                      <p className="text-xs text-slate-400">match</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
