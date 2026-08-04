'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, Suspense } from 'react';
import { Download, Filter, TrendingUp, Award, AlertCircle, Loader } from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';

interface ReportData {
  students: Array<{
    id: string;
    name: string;
    admissionNumber: string;
    subjectScores: Record<string, number>;
    average: number;
    grade: string;
  }>;
  subjects: Array<{ id: string; name: string }>;
  summary: {
    classAverage: number;
    highestScore: number;
    topPerformers: number;
    improvement: number | null;
  };
  gradeDistribution: Record<string, number>;
  subjectPerformance: Array<{ id: string; name: string; average: number }>;
}

function AcademicReportContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reportData, setReportData] = useState<ReportData | null>(null);

  const academicYearId = searchParams.get('academic_year_id');
  const termId = searchParams.get('term_id');
  const streamId = searchParams.get('stream_id');

  useEffect(() => {
    const fetchReportData = async () => {
      if (!academicYearId || !termId || !streamId) {
        setError('Missing required parameters. Please proceed from the Grades module.');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(
          `/api/school/reports/academic?academic_year_id=${academicYearId}&term_id=${termId}&stream_id=${streamId}`
        );
        
        if (!response.ok) {
          throw new Error('Failed to fetch report data');
        }
        
        const data = await response.json();
        setReportData(data);
      } catch (err) {
        console.error('[v0] Report fetch error:', err);
        setError('Failed to load academic report. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchReportData();
  }, [academicYearId, termId, streamId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-4">
          <Loader className="w-12 h-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Loading academic report...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Academic Performance Report</h1>
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-6 flex gap-4">
          <AlertCircle className="w-6 h-6 text-destructive flex-shrink-0 mt-1" />
          <div className="flex-1">
            <h3 className="font-semibold text-destructive mb-2">Unable to Load Report</h3>
            <p className="text-sm text-destructive/80 mb-4">{error}</p>
            <button
              onClick={() => router.push('/grades')}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm"
            >
              Return to Grades
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!reportData || reportData.students.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Academic Performance Report</h1>
        <div className="bg-muted border border-border rounded-lg p-6 text-center">
          <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
          <p className="text-muted-foreground mb-4">No grade data is available for this class and term yet.</p>
          <button
            onClick={() => router.push('/grades')}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm"
          >
            Return to Grades
          </button>
        </div>
      </div>
    );
  }

  const gradeColors: Record<string, string> = {
    'A+': 'bg-green-500/20 text-green-600',
    'A': 'bg-blue-500/20 text-blue-600',
    'B': 'bg-yellow-500/20 text-yellow-600',
    'C': 'bg-orange-500/20 text-orange-600',
    'D': 'bg-red-500/20 text-red-600',
    'F': 'bg-red-500/20 text-red-600',
  };

  const totalStudents = reportData.students.length;
  const gradeDistributionEntries = Object.entries(reportData.gradeDistribution);
  const maxGradeCount = Math.max(...gradeDistributionEntries.map(([, count]) => count));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Academic Performance Report</h1>
          <p className="text-muted-foreground mt-1">Analyze student grades and academic progress</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity">
          <Download className="w-5 h-5" />
          <span>Export PDF</span>
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-muted-foreground text-sm mb-2">Class Average</p>
          <p className="text-3xl font-bold text-foreground">{reportData.summary.classAverage.toFixed(1)}%</p>
          <p className="text-xs text-muted-foreground mt-1">From {reportData.students.length} students</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-muted-foreground text-sm mb-2">Highest Score</p>
          <p className="text-3xl font-bold text-foreground">{reportData.summary.highestScore}</p>
          <p className="text-xs text-muted-foreground mt-1">In this term</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-muted-foreground text-sm mb-2">Top Performers</p>
          <p className="text-3xl font-bold text-foreground">{reportData.summary.topPerformers}</p>
          <p className="text-xs text-muted-foreground mt-1">A+ and A grades</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-muted-foreground text-sm mb-2">Improvement</p>
          <p className="text-3xl font-bold text-foreground">{reportData.summary.improvement ? reportData.summary.improvement.toFixed(1) + '%' : 'N/A'}</p>
          <p className="text-xs text-muted-foreground mt-1">vs previous term</p>
        </div>
      </div>

      {/* Grade Distribution & Subject Performance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-lg font-bold text-foreground mb-4">Grade Distribution</h3>
          <div className="space-y-3">
            {gradeDistributionEntries.map(([grade, count]) => (
              <div key={grade} className="flex items-center gap-4">
                <span className="font-bold text-foreground w-8">{grade}</span>
                <div className="flex-1 h-8 bg-muted rounded-lg overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${maxGradeCount > 0 ? (count / maxGradeCount) * 100 : 0}%` }}
                  />
                </div>
                <span className="text-sm text-muted-foreground w-12 text-right">{count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-lg font-bold text-foreground mb-4">Subject Performance</h3>
          <div className="space-y-3">
            {reportData.subjectPerformance.map((subject) => (
              <div key={subject.id} className="flex items-center gap-4">
                <span className="text-sm font-medium text-foreground w-20 truncate">{subject.name}</span>
                <div className="flex-1 h-6 bg-muted rounded-lg overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${Math.min(subject.average, 100)}%` }}
                  />
                </div>
                <span className="text-sm font-bold text-foreground w-12 text-right">{subject.average.toFixed(1)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Student Details Table */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h2 className="text-xl font-bold text-foreground mb-4">Student Performance Details</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-foreground">Student Name</th>
                <th className="px-4 py-3 text-center font-semibold text-foreground">Admission No</th>
                {reportData.subjects.map((subject) => (
                  <th key={subject.id} className="px-4 py-3 text-center font-semibold text-foreground text-xs">
                    {subject.name.split(' ')[0]}
                  </th>
                ))}
                <th className="px-4 py-3 text-center font-semibold text-foreground">Average</th>
                <th className="px-4 py-3 text-center font-semibold text-foreground">Grade</th>
              </tr>
            </thead>
            <tbody>
              {reportData.students.map((student) => (
                <tr key={student.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-foreground">{student.name}</td>
                  <td className="px-4 py-3 text-center text-muted-foreground">{student.admissionNumber}</td>
                  {reportData.subjects.map((subject) => (
                    <td key={subject.id} className="px-4 py-3 text-center">
                      {student.subjectScores[subject.id] ? student.subjectScores[subject.id].toFixed(1) : '-'}
                    </td>
                  ))}
                  <td className="px-4 py-3 text-center font-semibold text-foreground">
                    {student.average.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${gradeColors[student.grade] || gradeColors['F']}`}>
                      <Award className="w-3 h-3" />
                      {student.grade}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function AcademicReportPage() {
  return (
    <Suspense fallback={<div className="text-center py-12">Loading academic report...</div>}>
      <AcademicReportContent />
    </Suspense>
  );
}
