'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatDateTime, formatDate } from '@/lib/utils';
import {
  Users,
  BookOpen,
  TrendingUp,
  Clock,
  AlertCircle,
  Loader2,
  ArrowRight,
  Calendar,
  Activity,
  CheckCircle2,
} from 'lucide-react';

interface DashboardStats {
  totalStudents: number;
  totalTeachers: number;
  totalClasses: number;
  attendanceRate: number;
  recentActivities: Activity[];
  upcomingEvents: UpcomingEvent[];
}

interface Activity {
  id: string;
  type: string;
  description: string;
  timestamp: string;
  user: string;
}

interface UpcomingEvent {
  id: string;
  title: string;
  date: string;
  type: string;
}

const StatCard = ({
  icon,
  label,
  value,
  subtext,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subtext?: string;
  color: string;
}) => (
  <div className="bg-card border border-border rounded-lg p-4 sm:p-6 hover:shadow-md transition-shadow">
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1 min-w-0">
        <p className="text-muted-foreground text-xs sm:text-sm font-medium">{label}</p>
        <p className="text-2xl sm:text-3xl font-bold text-foreground mt-2">{value}</p>
        {subtext && <p className="text-xs text-muted-foreground mt-1">{subtext}</p>}
      </div>
      <div className={`p-2 sm:p-3 rounded-lg flex-shrink-0 ${color}`}>{icon}</div>
    </div>
  </div>
);

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [setupCompleted, setSetupCompleted] = useState(true);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/school/dashboard/stats', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch stats');
      const data = await response.json();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const checkSetupAndFetch = async () => {
      try {
        // Check setup status
        const sessionResponse = await fetch('/api/auth/session', {
          credentials: 'include'
        });
        if (sessionResponse.ok) {
          const sessionData = await sessionResponse.json();
          setSetupCompleted(sessionData.session?.setupCompleted !== false);
        }
        fetchStats();
      } catch (err) {
        console.error('[v0] Error checking setup:', err);
      }
    };
    
    checkSetupAndFetch();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6 flex gap-4">
        <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
        <div>
          <h3 className="font-semibold text-red-600">Error</h3>
          <p className="text-sm text-red-600/80 mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Setup Incomplete Banner */}
      {!setupCompleted && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 sm:p-6 flex items-start gap-4">
          <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-amber-700">Setup Incomplete</h3>
            <p className="text-sm text-amber-700/80 mt-1">Complete your school setup to access all features.</p>
          </div>
          <button
            onClick={() => router.push('/setup')}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium text-sm flex-shrink-0 transition-colors"
          >
            Resume Setup
          </button>
        </div>
      )}

      {/* Header */}
      <div className="px-0">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground text-sm sm:text-base mt-2">Welcome back! Here's your school overview.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatCard
          icon={<Users className="w-6 h-6 text-blue-500" />}
          label="Total Students"
          value={stats?.totalStudents || 0}
          subtext="Enrolled"
          color="bg-blue-500/10"
        />
        <StatCard
          icon={<BookOpen className="w-6 h-6 text-purple-500" />}
          label="Total Teachers"
          value={stats?.totalTeachers || 0}
          subtext="Active staff"
          color="bg-purple-500/10"
        />
        <StatCard
          icon={<Users className="w-6 h-6 text-green-500" />}
          label="Total Classes"
          value={stats?.totalClasses || 0}
          subtext="Active"
          color="bg-green-500/10"
        />
        <StatCard
          icon={<TrendingUp className="w-6 h-6 text-amber-500" />}
          label="Attendance Rate"
          value={`${stats?.attendanceRate || 0}%`}
          subtext="This month"
          color="bg-amber-500/10"
        />
      </div>

      {/* Quick Actions */}
      <div className="bg-card border border-border rounded-lg p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-bold text-foreground mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            { icon: Users, label: 'Add Student', href: '/students/add' },
            { icon: Clock, label: 'Mark Attendance', href: '/attendance' },
            { icon: TrendingUp, label: 'Enter Grades', href: '/grades' },
            { icon: Calendar, label: 'View Calendar', href: '/calendar' },
            { icon: BookOpen, label: 'Manage Classes', href: '/classes' },
            { icon: Activity, label: 'View Reports', href: '/reports' },
          ].map(({ icon: Icon, label, href }) => (
            <a
              key={label}
              href={href}
              className="flex items-center gap-3 p-3 sm:p-4 rounded-lg border border-border hover:bg-muted transition-all hover:shadow-sm group"
            >
              <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-primary flex-shrink-0" />
              <span className="font-medium text-foreground text-sm sm:text-base truncate">{label}</span>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform ml-auto flex-shrink-0" />
            </a>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-card border border-border rounded-lg p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-bold text-foreground mb-4">Recent Activity</h2>
          <div className="space-y-4">
            {stats?.recentActivities && stats.recentActivities.length > 0 ? (
              stats.recentActivities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-4 pb-4 border-b border-border last:border-0 last:pb-0"
                >
                  <div className="w-2 h-2 rounded-full bg-primary mt-1 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground text-xs sm:text-sm">{activity.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {activity.user} • {formatDateTime(activity.timestamp)}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No recent activity</p>
            )}
          </div>
        </div>

        {/* Upcoming Events */}
        <div className="bg-card border border-border rounded-lg p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-bold text-foreground mb-4">Upcoming Events</h2>
          <div className="space-y-3">
            {stats?.upcomingEvents && stats.upcomingEvents.length > 0 ? (
              stats.upcomingEvents.map((event) => (
                <div
                  key={event.id}
                  className="p-3 rounded-lg bg-muted/50 border border-border hover:bg-muted transition-all hover:shadow-sm cursor-pointer"
                >
                  <p className="font-medium text-foreground text-xs sm:text-sm">{event.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDate(event.date)}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No upcoming events</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
