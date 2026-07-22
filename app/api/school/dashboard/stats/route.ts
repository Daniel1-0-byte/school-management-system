import { NextRequest, NextResponse } from 'next/server';
import {
  queryStudents,
  queryProfiles,
  queryClasses,
  queryAttendance,
  queryAuditLogs,
  formatSupabaseError,
} from '@/lib/supabase';
import { getSchoolIdFromRequest, validateSchoolIdAccess } from '@/lib/auth-utils';

export async function GET(request: NextRequest) {
  try {
    console.log('[v0] Dashboard stats GET called');
    console.log('[v0] Request URL:', request.url);
    console.log('[v0] Request searchParams:', request.nextUrl.searchParams.toString());
    
    // Extract and validate school_id
    const schoolId = getSchoolIdFromRequest(request);
    console.log('[v0] Extracted schoolId:', schoolId);
    
    const validation = await validateSchoolIdAccess(schoolId);
    console.log('[v0] Validation result:', validation);

    if (!validation.valid) {
      console.log('[v0] Validation failed, returning 400');
      return NextResponse.json(
        { error: validation.error || 'Invalid school access' },
        { status: 400 }
      );
    }
    
    console.log('[v0] Validation passed, proceeding with stats fetch');

    // Fetch total students
    const { count: totalStudents } = await queryStudents()
      .select('id', { count: 'exact', head: true })
      .eq('school_id', schoolId)
      .eq('status', 'active');

    // Fetch total teachers
    const { count: totalTeachers } = await queryProfiles()
      .select('id', { count: 'exact', head: true })
      .eq('school_id', schoolId)
      .eq('system_role', 'Teacher');

    // Fetch total classes
    const { count: totalClasses } = await queryClasses()
      .select('id', { count: 'exact', head: true })
      .eq('school_id', schoolId);

    // Fetch attendance rate for last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];

    const { data: attendanceData, error: attendanceError } = await queryAttendance()
      .select('status')
      .eq('school_id', schoolId)
      .gte('date', thirtyDaysAgo);

    const attendanceRate =
      attendanceData && attendanceData.length > 0
        ? Math.round(
          ((attendanceData as any[]).filter((a) => a.status === 'present').length /
            attendanceData.length) *
          100
        )
        : 0;

    // Fetch recent audit activities
    const { data: recentActivities } = await queryAuditLogs()
      .select('id, action, target_name, created_at, actor_id')
      .eq('school_id', schoolId)
      .order('created_at', { ascending: false })
      .limit(5);

    return NextResponse.json({
      totalStudents: totalStudents || 0,
      totalTeachers: totalTeachers || 0,
      totalClasses: totalClasses || 0,
      attendanceRate: attendanceRate || 0,
      recentActivities: (recentActivities || []).map((activity: any) => ({
        id: activity.id,
        type: activity.action,
        description: `${activity.action.replace(/_/g, ' ')}: ${activity.target_name || 'System'}`,
        timestamp: activity.created_at,
        user: activity.actor_id || 'System',
      })),
    });
  } catch (error) {
    console.error('[v0] Dashboard stats error:', error);
    return NextResponse.json(
      { error: formatSupabaseError(error) },
      { status: 400 }
    );
  }
}
