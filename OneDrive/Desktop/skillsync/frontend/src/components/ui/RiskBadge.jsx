import React from 'react';
import clsx from 'clsx';

const riskConfig = {
  Low: { class: 'risk-low', label: 'Low Risk', dot: 'bg-emerald-500' },
  Moderate: { class: 'risk-moderate', label: 'Moderate', dot: 'bg-yellow-500' },
  High: { class: 'risk-high', label: 'High Risk', dot: 'bg-orange-500' },
  Critical: { class: 'risk-critical', label: 'Critical', dot: 'bg-red-500' }
};

export default function RiskBadge({ level, score, showScore = true }) {
  const config = riskConfig[level] || riskConfig.Low;

  return (
    <span className={clsx('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold', config.class)}>
      <span className={clsx('w-1.5 h-1.5 rounded-full', config.dot)} />
      {config.label}
      {showScore && score !== undefined && (
        <span className="opacity-70">({Math.round(score * 100)}%)</span>
      )}
    </span>
  );
}
