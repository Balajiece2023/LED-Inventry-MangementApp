import React from 'react';

interface StatusBadgeProps {
  status: string;
  variant?: 'order' | 'stage' | 'qc' | 'dispatch' | 'stock' | 'default';
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, variant = 'default', className = '' }) => {
  let colorStyles = 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700';

  const s = status.toUpperCase();

  // Order status
  if (s === 'DRAFT') {
    colorStyles = 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700';
  } else if (s === 'LOCKED') {
    colorStyles = 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200 dark:border-amber-800/50';
  } else if (s === 'IN_PROGRESS') {
    colorStyles = 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border-blue-200 dark:border-blue-800/50';
  } else if (s === 'COMPLETED' || s === 'DISPATCHED' || s === 'PASS') {
    colorStyles = 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50';
  } else if (s === 'CANCELLED' || s === 'FAIL') {
    colorStyles = 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border-rose-200 dark:border-rose-800/50';
  } else if (s === 'PENDING') {
    colorStyles = 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400 border-purple-200 dark:border-purple-800/50';
  }

  // Stages
  if (s === 'MATERIAL_ISSUED') {
    colorStyles = 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-400 border-cyan-200 dark:border-cyan-800/50';
  } else if (s === 'ASSEMBLY_STARTED') {
    colorStyles = 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800/50';
  } else if (s === 'ASSEMBLY_COMPLETED') {
    colorStyles = 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400 border-sky-200 dark:border-sky-800/50';
  } else if (s === 'TESTING') {
    colorStyles = 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200 dark:border-amber-800/50';
  } else if (s === 'PACKING') {
    colorStyles = 'bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-400 border-teal-200 dark:border-teal-800/50';
  } else if (s === 'FINISHED') {
    colorStyles = 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50';
  }

  // Readable label
  const formattedText = s.replace(/_/g, ' ');

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${colorStyles} ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 opacity-70"></span>
      {formattedText}
    </span>
  );
};
