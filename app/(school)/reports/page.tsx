'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, Suspense } from 'react';
import { BarChart3, Clock, DollarSign, TrendingUp, Download, Filter, AlertCircle, FileText } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AcademicPerformanceTab } from '@/components/reports/academic-performance-tab';
import { ReportCardsTab } from '@/components/reports/report-cards-tab';

function ReportsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<'academic' | 'report-cards'>('academic');
  const [contextInfo, setContextInfo] = useState<string>('');
  const [completionError, setCompletionError] = useState<string | null>(null);

  // Get context from URL params
  useEffect(() => {
    const academicYearId = searchParams.get('academic_year_id');
    const termId = searchParams.get('term_id');
    const streamId = searchParams.get('stream_id');

    if (academicYearId && termId && streamId) {
      // TODO: In future phases, validate completion server-side
      const info = `Academic Year: ${academicYearId.substring(0, 8)}... | Term: ${termId.substring(0, 8)}... | Class: ${streamId.substring(0, 8)}...`;
      setContextInfo(info);
    } else {
      setCompletionError('Missing required parameters. Please proceed from the Grades module.');
    }
  }, [searchParams]);

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

  const academicYearId = searchParams.get('academic_year_id');
  const termId = searchParams.get('term_id');
  const streamId = searchParams.get('stream_id');

  // Missing context parameters - show error below tabs, not instead of tabs
  const hasMissingParams = !academicYearId || !termId || !streamId;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Reports</h1>
        <p className="text-muted-foreground mt-1">View school analytics and performance reports</p>
        {contextInfo && (
          <p className="text-xs text-muted-foreground mt-2 font-mono bg-muted px-2 py-1 rounded w-fit">
            {contextInfo}
          </p>
        )}
      </div>

      {/* Tab Navigation - ALWAYS VISIBLE */}
      <div className="flex gap-2 border-b border-border">
        <button
          onClick={() => setActiveTab('academic')}
          className={`px-6 py-3 font-medium transition-colors border-b-2 ${
            activeTab === 'academic'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Academic Performance
          </div>
        </button>
        <button
          onClick={() => setActiveTab('report-cards')}
          className={`px-6 py-3 font-medium transition-colors border-b-2 ${
            activeTab === 'report-cards'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Report Cards
          </div>
        </button>
      </div>

      {/* Missing Parameters Error - shown below tabs */}
      {hasMissingParams && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-6 flex gap-4">
          <AlertCircle className="w-6 h-6 text-destructive flex-shrink-0 mt-1" />
          <div className="flex-1">
            <h3 className="font-semibold text-destructive mb-2">Unable to Load Reports</h3>
            <p className="text-sm text-destructive/80 mb-4">{completionError || 'Missing required parameters. Please proceed from the Grades module.'}</p>
            <button
              onClick={() => router.push('/grades')}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm"
            >
              Return to Grades
            </button>
          </div>
        </div>
      )}

      {/* Tab Content - shown only when parameters are valid */}
      {!hasMissingParams && (
        <>
          {activeTab === 'academic' && (
            <AcademicPerformanceTab
              academicYearId={academicYearId!}
              termId={termId!}
              streamId={streamId!}
            />
          )}

          {activeTab === 'report-cards' && (
            <ReportCardsTab
              academicYearId={academicYearId!}
              termId={termId!}
              streamId={streamId!}
            />
          )}
        </>
      )}
    </div>
  );
}

export default function ReportsPage() {
  return (
    <Suspense fallback={<div className="text-center py-12">Loading reports...</div>}>
      <ReportsContent />
    </Suspense>
  );
}
