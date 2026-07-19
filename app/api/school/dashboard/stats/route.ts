import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from '@/lib/env';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('cookie') || '';
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get school_id from session or query param
    const schoolId = request.nextUrl.searchParams.get('school_id');
    if (!schoolId) {
      return NextResponse.json(
        { error: 'School ID required' },
        { status: 400 }
      );
    }

    // Fetch total students
    const { count: totalStudents } = await supabase
      .from('students')
      .select('id', { count: 'exact', head: true })
      .eq('school_id', schoolId)
      .eq('status', 'active');

    // Fetch total teachers
    const { count: totalTeachers } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('school_id', schoolId)
      .eq('system_role', 'Teacher');

    // Fetch total classes
    const { count: totalClasses } = await supabase
      .from('classes')
      .select('id', { count: 'exact', head: true })
      .eq('school_id', schoolId);

    // Fetch attendance rate (simplified - count present / total)
    const { data: attendanceData } = await supabase
      .from('attendance')
      .select('status')
      .eq('school_id', schoolId)
      .gte('marked_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    const attendanceRate =
      attendanceData && attendanceData.length > 0
        ? Math.round(
          (attendanceData.filter((a) => a.status === 'present').length / attendanceData.length) *
          100
        )
        : 0;

    // Fetch recent activities
    const { data: recentActivities } = await supabase
      .from('audit_logs')
      .select('id, action, target_name, created_at, actor_id')
      .eq('school_id', schoolId)
      .order('created_at', { ascending: false })
      .limit(5);

    // Fetch upcoming events
    const { data: upcomingEvents } = await supabase
      .from('calendar_events')
      .select('id, title, event_date, type')
      .eq('school_id', schoolId)
      .gte('event_date', new Date().toISOString())
      .order('event_date', { ascending: true })
      .limit(5);

    return NextResponse.json({
      totalStudents: totalStudents || 0,
      totalTeachers: totalTeachers || 0,
      totalClasses: totalClasses || 0,
      attendanceRate,
      recentActivities: (recentActivities || []).map((activity) => ({
        id: activity.id,
        type: activity.action,
        description: `${activity.action.replace(/_/g, ' ')}: ${activity.target_name || 'Unknown'}`,
        timestamp: activity.created_at,
        user: activity.actor_id || 'System',
      })),
      upcomingEvents: (upcomingEvents || []).map((event) => ({
        id: event.id,
        title: event.title,
        date: event.event_date,
        type: event.type,
      })),
    });
  } catch (error) {
    console.error('[v0] Dashboard stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard stats' },
      { status: 500 }
    );
  }
}
