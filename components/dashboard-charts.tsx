'use client';

import React from 'react';
import { TrendingUp } from 'lucide-react';

interface ChartData {
  month: string;
  value: number;
}

interface DashboardChartsProps {
  enrollmentTrend?: ChartData[];
  attendanceByClass?: { className: string; rate: number }[];
  loading?: boolean;
}

export function DashboardCharts({
  enrollmentTrend = [],
  attendanceByClass = [],
  loading = false,
}: DashboardChartsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-lg p-6 animate-pulse">
          <div className="h-4 bg-muted rounded w-32 mb-4" />
          <div className="h-48 bg-muted rounded" />
        </div>
        <div className="bg-card border border-border rounded-lg p-6 animate-pulse">
          <div className="h-4 bg-muted rounded w-32 mb-4" />
          <div className="h-48 bg-muted rounded" />
        </div>
      </div>
    );
  }

  const maxEnrollment = enrollmentTrend.length
    ? Math.max(...enrollmentTrend.map((d) => d.value))
    : 100;

  const maxAttendance = attendanceByClass.length
    ? Math.max(...attendanceByClass.map((d) => d.rate))
    : 100;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Enrollment Trend Chart */}
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-foreground">
            Enrollment Trend
          </h3>
          <TrendingUp className="w-5 h-5 text-primary" />
        </div>

        {enrollmentTrend.length > 0 ? (
          <div className="space-y-4">
            {enrollmentTrend.map((data, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground w-12 shrink-0">
                  {data.month}
                </span>
                <div className="flex-1 h-8 bg-muted rounded-lg overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-primary/60 transition-all rounded-lg"
                    style={{ width: `${(data.value / maxEnrollment) * 100}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-foreground w-12 text-right">
                  {data.value}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8">
            No data available
          </p>
        )}
      </div>

      {/* Attendance by Class Chart */}
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-foreground">
            Attendance by Class
          </h3>
          <TrendingUp className="w-5 h-5 text-primary" />
        </div>

        {attendanceByClass.length > 0 ? (
          <div className="space-y-4">
            {attendanceByClass.slice(0, 5).map((data, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground w-20 shrink-0 truncate">
                  {data.className}
                </span>
                <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all rounded-full ${
                      data.rate >= 80
                        ? 'bg-green-500'
                        : data.rate >= 60
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                    }`}
                    style={{ width: `${data.rate}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-foreground w-12 text-right">
                  {data.rate.toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8">
            No data available
          </p>
        )}
      </div>
    </div>
  );
}
