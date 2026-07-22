'use client';

import React from 'react';
import { Users, BookOpen, Calendar, TrendingUp } from 'lucide-react';

interface StatCard {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: number;
  unit?: string;
}

interface DashboardStatsProps {
  totalStudents: number;
  totalStaff: number;
  totalClasses: number;
  attendanceRate: number;
  loading?: boolean;
}

export function DashboardStats({
  totalStudents,
  totalStaff,
  totalClasses,
  attendanceRate,
  loading = false,
}: DashboardStatsProps) {
  const stats: StatCard[] = [
    {
      title: 'Total Students',
      value: totalStudents,
      icon: <Users className="w-6 h-6" />,
      unit: 'enrolled',
    },
    {
      title: 'Total Staff',
      value: totalStaff,
      icon: <Calendar className="w-6 h-6" />,
      unit: 'members',
    },
    {
      title: 'Active Classes',
      value: totalClasses,
      icon: <BookOpen className="w-6 h-6" />,
      unit: 'classes',
    },
    {
      title: 'Average Attendance',
      value: attendanceRate.toFixed(1),
      icon: <TrendingUp className="w-6 h-6" />,
      unit: '%',
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((_, idx) => (
          <div
            key={idx}
            className="bg-card border border-border rounded-lg p-6 animate-pulse"
          >
            <div className="h-4 bg-muted rounded w-24 mb-2" />
            <div className="h-8 bg-muted rounded w-16" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, idx) => (
        <div
          key={idx}
          className="bg-card border border-border rounded-lg p-6 hover:shadow-lg transition-shadow"
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-sm text-muted-foreground font-medium">
                {stat.title}
              </p>
              <div className="flex items-baseline gap-2 mt-2">
                <p className="text-2xl font-bold text-foreground">
                  {stat.value}
                </p>
                {stat.unit && (
                  <p className="text-xs text-muted-foreground">{stat.unit}</p>
                )}
              </div>
            </div>
            <div className="text-primary opacity-80">{stat.icon}</div>
          </div>

          {stat.trend && (
            <div className="flex items-center gap-1 text-xs text-green-600">
              <TrendingUp className="w-3 h-3" />
              {stat.trend > 0 ? '+' : ''}{stat.trend}% from last month
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
