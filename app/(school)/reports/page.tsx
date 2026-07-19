'use client';

export const dynamic = 'force-dynamic';

import React, { useState } from 'react';
import { BarChart3, Clock, DollarSign, TrendingUp, Download, Filter } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ReportsPage() {
  const router = useRouter();
  const [dateRange, setDateRange] = useState('month');

  const reports = [
    {
      id: 'attendance',
      title: 'Attendance Report',
      description: 'View student attendance trends and patterns',
      icon: Clock,
      color: 'bg-blue-500',
      href: '/reports/attendance',
      stats: {
        label: 'Current Month',
        value: '87%',
        trend: '+2.5%',
      },
    },
    {
      id: 'academic',
      title: 'Academic Performance',
      description: 'Analyze student grades and academic progress',
      icon: TrendingUp,
      color: 'bg-green-500',
      href: '/reports/academic',
      stats: {
        label: 'Class Average',
        value: '76%',
        trend: '+1.2%',
      },
    },
    {
      id: 'financial',
      title: 'Fee Collection',
      description: 'Track fee payments and outstanding amounts',
      icon: DollarSign,
      color: 'bg-amber-500',
      href: '/reports/financial',
      stats: {
        label: 'Collection Rate',
        value: '92%',
        trend: '+5%',
      },
    },
    {
      id: 'analytics',
      title: 'School Analytics',
      description: 'Comprehensive school statistics and metrics',
      icon: BarChart3,
      color: 'bg-purple-500',
      href: '/reports/analytics',
      stats: {
        label: 'Total Students',
        value: '485',
        trend: '+12',
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Reports</h1>
          <p className="text-muted-foreground mt-1">View school analytics and performance reports</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors">
          <Filter className="w-5 h-5" />
          <span>Filter</span>
        </button>
      </div>

      {/* Date Range Filter */}
      <div className="bg-card border border-border rounded-lg p-4">
        <label className="block text-sm font-medium text-foreground mb-3">Date Range</label>
        <div className="flex gap-2">
          {[
            { value: 'week', label: 'This Week' },
            { value: 'month', label: 'This Month' },
            { value: 'quarter', label: 'This Quarter' },
            { value: 'year', label: 'This Year' },
          ].map((option) => (
            <button
              key={option.value}
              onClick={() => setDateRange(option.value)}
              className={`px-4 py-2 rounded-lg transition-colors ${
                dateRange === option.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-foreground hover:bg-muted/80'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reports.map((report) => {
          const Icon = report.icon;
          return (
            <div
              key={report.id}
              onClick={() => router.push(report.href)}
              className="bg-card border border-border rounded-lg p-6 hover:shadow-lg cursor-pointer transition-all hover:border-primary"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-lg ${report.color}/20`}>
                  <Icon className={`w-6 h-6 ${report.color.replace('bg-', 'text-')}`} />
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    // Handle download
                  }}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                >
                  <Download className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>

              {/* Title and Description */}
              <h3 className="text-lg font-bold text-foreground mb-2">{report.title}</h3>
              <p className="text-sm text-muted-foreground mb-6">{report.description}</p>

              {/* Stats */}
              <div className="p-4 bg-muted/50 rounded-lg border border-border">
                <p className="text-xs text-muted-foreground mb-1">{report.stats.label}</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-bold text-foreground">{report.stats.value}</p>
                  <span className="text-xs text-green-600 font-semibold">{report.stats.trend}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-6">
        <h3 className="font-semibold text-blue-600 mb-3">Pro Tips</h3>
        <ul className="text-sm text-blue-600/80 space-y-2">
          <li>✓ Generate automated reports on schedule</li>
          <li>✓ Export reports in PDF and Excel formats</li>
          <li>✓ Set up email notifications for alerts</li>
          <li>✓ Track year-over-year performance trends</li>
        </ul>
      </div>
    </div>
  );
}
