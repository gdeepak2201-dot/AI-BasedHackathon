import React, { useEffect, useRef, useState } from 'react';
import { useQuery } from 'react-query';
import { Network, Zap, TrendingUp, RefreshCw } from 'lucide-react';
import { aiAPI } from '../services/api';
import { useAuthStore } from '../store/authStore';
import * as d3 from 'd3';
import clsx from 'clsx';

const nodeColors = {
  user: '#6366f1',
  category: '#8b5cf6',
  skill: '#3b82f6',
  hidden_skill: '#f59e0b'
};

export default function SkillGraph() {
  const { user } = useAuthStore();
  const svgRef = useRef(null);
  const [selectedNode, setSelectedNode] = useState(null);

  const { data: graphData, isLoading, refetch } = useQuery(
    ['skill-graph', user?.id],
    () => aiAPI.skillGraph(user?.id).then(r => r.data.graph),
    { enabled: !!user?.id }
  );

  const { data: skillProfile } = useQuery(
    ['skills', user?.id],
    () => aiAPI.skills(user?.id).then(r => r.data.skills),
    { enabled: !!user?.id }
  );

  useEffect(() => {
    if (!graphData || !svgRef.current) return;

    const { nodes, edges } = graphData;
    const container = svgRef.current.parentElement;
    const width = container.clientWidth;
    const height = 500;

    d3.select(svgRef.current).selectAll('*').remove();

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height);

    // Zoom behavior
    const g = svg.append('g');
    svg.call(d3.zoom().scaleExtent([0.3, 3]).on('zoom', (event) => {
      g.attr('transform', event.transform);
    }));

    // Force simulation
    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(edges).id(d => d.id).distance(80))
      .force('charge', d3.forceManyBody().strength(-200))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(d => (d.size || 10) + 5));

    // Draw edges
    const link = g.append('g').selectAll('line')
      .data(edges)
      .join('line')
      .attr('stroke', d => d.dashed ? '#f59e0b' : '#e2e8f0')
      .attr('stroke-width', d => Math.min(3, d.weight || 1))
      .attr('stroke-dasharray', d => d.dashed ? '5,5' : null)
      .attr('opacity', 0.6);

    // Draw nodes
    const node = g.append('g').selectAll('g')
      .data(nodes)
      .join('g')
      .attr('cursor', 'pointer')
      .call(d3.drag()
        .on('start', (event, d) => { if (!event.active) simulation.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
        .on('drag', (event, d) => { d.fx = event.x; d.fy = event.y; })
        .on('end', (event, d) => { if (!event.active) simulation.alphaTarget(0); d.fx = null; d.fy = null; })
      )
      .on('click', (event, d) => setSelectedNode(d));

    node.append('circle')
      .attr('r', d => d.size || 10)
      .attr('fill', d => nodeColors[d.type] || '#6366f1')
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .attr('opacity', 0.9);

    node.append('text')
      .text(d => d.label)
      .attr('text-anchor', 'middle')
      .attr('dy', d => (d.size || 10) + 14)
      .attr('font-size', d => d.type === 'user' ? 13 : 10)
      .attr('font-weight', d => d.type === 'user' ? 700 : 400)
      .attr('fill', '#64748b');

    simulation.on('tick', () => {
      link
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);

      node.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    return () => simulation.stop();
  }, [graphData]);

  const categories = skillProfile?.skillsByCategory || {};

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Network className="text-primary-500" size={24} />
            Skill Graph
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            AI-discovered skills and growth trajectory
          </p>
        </div>
        <button onClick={() => refetch()} className="btn-secondary">
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Graph */}
        <div className="lg:col-span-2 glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-900 dark:text-white">Interactive Skill Network</h2>
            <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
              {Object.entries(nodeColors).map(([type, color]) => (
                <div key={type} className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                  <span className="capitalize">{type.replace('_', ' ')}</span>
                </div>
              ))}
            </div>
          </div>
          {isLoading ? (
            <div className="h-96 flex items-center justify-center">
              <div className="text-center">
                <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-sm text-slate-400">Building skill graph...</p>
              </div>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl bg-slate-50 dark:bg-slate-900/50">
              <svg ref={svgRef} className="w-full" />
            </div>
          )}
          {selectedNode && (
            <div className="mt-3 p-3 bg-primary-50 dark:bg-primary-900/20 rounded-xl">
              <p className="text-sm font-medium text-primary-700 dark:text-primary-400">{selectedNode.label}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">{selectedNode.type?.replace('_', ' ')}</p>
            </div>
          )}
        </div>

        {/* Skill breakdown */}
        <div className="space-y-4">
          {/* Hidden skills */}
          {skillProfile?.hiddenSkills?.length > 0 && (
            <div className="glass-card p-5">
              <h3 className="font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                <Zap size={16} className="text-amber-500" />
                Hidden Skills Discovered
              </h3>
              <div className="space-y-2">
                {skillProfile.hiddenSkills.slice(0, 5).map((hs, i) => (
                  <div key={i} className="flex items-center justify-between p-2 bg-amber-50 dark:bg-amber-900/10 rounded-lg">
                    <span className="text-sm text-amber-700 dark:text-amber-400 font-medium">{hs.skill}</span>
                    <span className="text-xs text-amber-600 dark:text-amber-500">{hs.frequency}x used</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Skills by category */}
          <div className="glass-card p-5">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
              <TrendingUp size={16} className="text-primary-500" />
              Skills by Category
            </h3>
            <div className="space-y-3">
              {Object.entries(categories).map(([category, skills]) => (
                <div key={category}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-slate-700 dark:text-slate-300 capitalize">{category}</span>
                    <span className="text-slate-400">{skills.length} skills</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {skills.map(skill => (
                      <span key={skill} className="text-xs bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 px-2 py-0.5 rounded-md">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
              {Object.keys(categories).length === 0 && (
                <p className="text-sm text-slate-400 text-center py-4">No skills categorized yet</p>
              )}
            </div>
          </div>

          {/* Declared skills */}
          {skillProfile?.declaredSkills?.length > 0 && (
            <div className="glass-card p-5">
              <h3 className="font-semibold text-slate-900 dark:text-white mb-3">All Skills</h3>
              <div className="flex flex-wrap gap-2">
                {skillProfile.declaredSkills.map(skill => (
                  <span key={skill} className="badge bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
