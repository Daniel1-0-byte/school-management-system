import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  description: string;
  trend?: number;
  variant?: 'default' | 'success' | 'warning' | 'danger';
}

export function StatCard({
  title,
  value,
  icon,
  description,
  trend,
  variant = 'default',
}: StatCardProps) {
  const bgColors = {
    default: 'bg-card',
    success: 'bg-green-500/10',
    warning: 'bg-yellow-500/10',
    danger: 'bg-red-500/10',
  };

  const borderColors = {
    default: 'border-border',
    success: 'border-green-500/30',
    warning: 'border-yellow-500/30',
    danger: 'border-red-500/30',
  };

  const iconColors = {
    default: 'text-muted-foreground',
    success: 'text-green-500',
    warning: 'text-yellow-500',
    danger: 'text-red-500',
  };

  return (
    <div className={`${bgColors[variant]} border ${borderColors[variant]} rounded-lg p-6 flex flex-col justify-between`}>
      <div className="flex items-start justify-between mb-4">
        <div className={`${iconColors[variant]} opacity-80`}>{icon}</div>
        {trend !== undefined && trend !== 0 && (
          <div
            className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded ${
              trend > 0
                ? 'bg-green-500/20 text-green-600'
                : 'bg-red-500/20 text-red-600'
            }`}
          >
            {trend > 0 ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            <span>{Math.abs(trend)}%</span>
          </div>
        )}
      </div>

      <div>
        <p className="text-muted-foreground text-sm font-medium mb-1">{title}</p>
        <p className="text-3xl font-bold text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground mt-2">{description}</p>
      </div>
    </div>
  );
}
