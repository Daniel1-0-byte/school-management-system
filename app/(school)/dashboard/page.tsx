'use client';

import { useEffect, useState } from 'react';
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
  <div className="bg-card border border-border rounded-lg p-6">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-muted-foreground text-sm font-medium">{label}</p>
        <p className="text-3xl font-bold text-foreground mt-2">{value}</p>
        {subtext && <p className="text-xs text-muted-foreground mt-1">{subtext}</p>}
      </div>
      <div className={`p-3 rounded-lg ${color}`}>{icon}</div>
    </div>
  </div>
);

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/school/dashboard/stats');
        if (!response.ok) throw new Error('Failed to fetch stats');
        const data = await response.json();
        setStats(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
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
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-2">Welcome back! Here's your school overview.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
      <div className="bg-card border border-border rounded-lg p-6">
        <h2 className="text-xl font-bold text-foreground mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
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
              className="flex items-center gap-3 p-4 rounded-lg border border-border hover:bg-muted transition-colors group"
            >
              <Icon className="w-5 h-5 text-primary" />
              <span className="font-medium text-foreground">{label}</span>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform ml-auto" />
            </a>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-card border border-border rounded-lg p-6">
          <h2 className="text-xl font-bold text-foreground mb-4">Recent Activity</h2>
          <div className="space-y-4">
            {stats?.recentActivities && stats.recentActivities.length > 0 ? (
              stats.recentActivities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-4 pb-4 border-b border-border last:border-0 last:pb-0"
                >
                  <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground text-sm">{activity.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {activity.user} • {new Date(activity.timestamp).toLocaleString()}
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
        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-xl font-bold text-foreground mb-4">Upcoming Events</h2>
          <div className="space-y-3">
            {stats?.upcomingEvents && stats.upcomingEvents.length > 0 ? (
              stats.upcomingEvents.map((event) => (
                <div
                  key={event.id}
                  className="p-3 rounded-lg bg-muted/50 border border-border hover:bg-muted transition-colors"
                >
                  <p className="font-medium text-foreground text-sm">{event.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(event.date).toLocaleDateString()}
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
