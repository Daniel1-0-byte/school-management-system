'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { AlertCircle, Loader2 } from 'lucide-react';
import { SchoolService } from '@/lib/services/school-service';
import { DashboardStats } from '@/components/dashboard-stats';
import { DashboardCharts } from '@/components/dashboard-charts';

interface DashboardData {
  totalStudents: number;
  totalStaff: number;
  totalClasses: number;
  averageAttendance: number;
  enrollmentTrend: { month: string; value: number }[];
  attendanceByClass: { className: string; rate: number }[];
}

export default function DashboardPage() {
  const params = useParams();
  const schoolId = params?.schoolId as string;

  const [data, setData] = useState<DashboardData>({
    totalStudents: 0,
    totalStaff: 0,
    totalClasses: 0,
    averageAttendance: 0,
    enrollmentTrend: [],
    attendanceByClass: [],
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!schoolId) return;

    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [statsResult, trendResult, attendanceResult] = await Promise.all([
          SchoolService.getDashboardStats(schoolId),
          SchoolService.getEnrollmentTrend(schoolId, 6),
          SchoolService.getAttendanceByClass(schoolId),
        ]);

        if (statsResult.error) {
          setError(statsResult.error);
          return;
        }

        setData({
          totalStudents: statsResult.totalStudents,
          totalStaff: statsResult.totalStaff,
          totalClasses: statsResult.totalClasses,
          averageAttendance: statsResult.averageAttendance,
          enrollmentTrend: trendResult.data || [],
          attendanceByClass: attendanceResult.data || [],
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [schoolId]);

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Overview of your school&apos;s key metrics and statistics
          </p>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-red-600">Error Loading Dashboard</h3>
              <p className="text-sm text-red-600/80 mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Statistics Cards */}
        <section>
          <DashboardStats
            totalStudents={data.totalStudents}
            totalStaff={data.totalStaff}
            totalClasses={data.totalClasses}
            attendanceRate={data.averageAttendance}
            loading={loading}
          />
        </section>

        {/* Charts Section */}
        <section>
          <DashboardCharts
            enrollmentTrend={data.enrollmentTrend}
            attendanceByClass={data.attendanceByClass}
            loading={loading}
          />
        </section>

        {/* Quick Actions */}
        <section className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <a
              href={`/school/${schoolId}/students/new`}
              className="px-4 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity text-center font-medium"
            >
              Enroll Student
            </a>
            <a
              href={`/school/${schoolId}/attendance`}
              className="px-4 py-3 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors text-center font-medium"
            >
              Mark Attendance
            </a>
            <a
              href={`/school/${schoolId}/staff/new`}
              className="px-4 py-3 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors text-center font-medium"
            >
              Add Staff
            </a>
            <a
              href={`/school/${schoolId}/classes/new`}
              className="px-4 py-3 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors text-center font-medium"
            >
              Create Class
            </a>
          </div>
        </section>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          </div>
        )}
      </div>
    </main>
  );
}
