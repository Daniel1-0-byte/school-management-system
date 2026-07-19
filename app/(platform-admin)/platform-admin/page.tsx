import React from 'react';
import Link from 'next/link';
import { headers } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from '@/lib/env';
import {
  BarChart3,
  Users,
  School,
  AlertCircle,
  TrendingUp,
  Activity,
} from 'lucide-react';
import { StatCard } from '@/components/platform-admin/stat-card';
import { RecentActivity } from '@/components/platform-admin/recent-activity';
import { SystemHealth } from '@/components/platform-admin/system-health';

async function getAdminStats() {
  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('[v0] Missing Supabase configuration');
      return null;
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch stats in parallel
    const [schoolsResult, usersResult, adminLogsResult] = await Promise.all([
      supabase.from('schools').select('id', { count: 'exact', head: true }),
      supabase.from('users').select('id', { count: 'exact', head: true }),
      supabase
        .from('audit_logs')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
    ]);

    return {
      totalSchools: schoolsResult.count || 0,
      totalUsers: usersResult.count || 0,
      recentAuditLogs: adminLogsResult.count || 0,
    };
  } catch (error) {
    console.error('[v0] Failed to fetch admin stats:', error);
    return null;
  }
}

async function getRecentAuditLogs() {
  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return [];
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data, error } = await supabase
      .from('audit_logs')
      .select('id, action, target_type, actor_id, created_at, ip_address')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('[v0] Failed to fetch recent logs:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('[v0] Error fetching logs:', error);
    return [];
  }
}

export default async function PlatformAdminDashboard() {
  const headersList = await headers();
  const adminId = headersList.get('x-admin-id');
  const adminEmail = headersList.get('x-admin-email');

  const stats = await getAdminStats();
  const recentLogs = await getRecentAuditLogs();

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="px-0">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground text-sm sm:text-base mt-2">
          Welcome back. Here&apos;s an overview of your platform.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Schools"
          value={stats?.totalSchools || 0}
          icon={<School className="w-6 h-6" />}
          description="Active institutions"
          trend={5}
        />
        <StatCard
          title="Total Users"
          value={stats?.totalUsers || 0}
          icon={<Users className="w-6 h-6" />}
          description="System accounts"
          trend={12}
        />
        <StatCard
          title="Recent Activities"
          value={stats?.recentAuditLogs || 0}
          icon={<Activity className="w-6 h-6" />}
          description="Last 7 days"
          trend={8}
        />
        <StatCard
          title="System Health"
          value="Good"
          icon={<AlertCircle className="w-6 h-6" />}
          description="All systems operational"
          trend={0}
          variant="success"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2">
          <RecentActivity logs={recentLogs} />
        </div>

        {/* System Health */}
        <div>
          <SystemHealth />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-card border border-border rounded-lg p-4 sm:p-6">
        <h2 className="text-base sm:text-lg font-semibold text-foreground mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          <Link href="/platform-admin/schools" className="p-3 sm:p-4 bg-muted hover:bg-muted/80 rounded-lg transition-all hover:shadow-sm text-left group block">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 sm:w-10 h-8 sm:h-10 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-500/30 transition-colors">
                <School className="w-4 sm:w-5 h-4 sm:h-5 text-blue-500" />
              </div>
              <div className="min-w-0">
                <p className="font-medium text-foreground text-xs sm:text-sm">Manage Schools</p>
                <p className="text-muted-foreground text-xs">Add or edit schools</p>
              </div>
            </div>
          </Link>

          <Link href="/platform-admin/users" className="p-3 sm:p-4 bg-muted hover:bg-muted/80 rounded-lg transition-all hover:shadow-sm text-left group block">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 sm:w-10 h-8 sm:h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center flex-shrink-0 group-hover:bg-cyan-500/30 transition-colors">
                <Users className="w-4 sm:w-5 h-4 sm:h-5 text-cyan-500" />
              </div>
              <div className="min-w-0">
                <p className="font-medium text-foreground text-xs sm:text-sm">User Management</p>
                <p className="text-muted-foreground text-xs">View all users</p>
              </div>
            </div>
          </Link>

          <Link href="/platform-admin/school-requests" className="p-3 sm:p-4 bg-muted hover:bg-muted/80 rounded-lg transition-all hover:shadow-sm text-left group block">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 sm:w-10 h-8 sm:h-10 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0 group-hover:bg-purple-500/30 transition-colors">
                <BarChart3 className="w-4 sm:w-5 h-4 sm:h-5 text-purple-500" />
              </div>
              <div className="min-w-0">
                <p className="font-medium text-foreground text-xs sm:text-sm">School Requests</p>
                <p className="text-muted-foreground text-xs">Review pending requests</p>
              </div>
            </div>
          </Link>
        </div>
      </div>

      {/* Debug Info */}
      {process.env.NODE_ENV === 'development' && (
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 text-sm text-blue-600">
          <p className="font-mono">
            Admin ID: {adminId} | Email: {adminEmail}
          </p>
        </div>
      )}
    </div>
  );
}
