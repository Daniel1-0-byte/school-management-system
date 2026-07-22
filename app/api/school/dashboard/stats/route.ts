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
    // Extract and validate school_id
    const schoolId = await getSchoolIdFromRequest(request);
    
    // Type guard to ensure schoolId is a string
    if (typeof schoolId !== 'string') {
      return NextResponse.json(
        { error: 'Invalid school ID' },
        { status: 400 }
      );
    }
    
    const validation = await validateSchoolIdAccess(schoolId);

    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error || 'Invalid school access' },
        { status: 400 }
      );
    }

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
    return NextResponse.json(
      { error: formatSupabaseError(error) },
      { status: 400 }
    );
  }
}
