import { NextRequest, NextResponse } from 'next/server';
import { queryClasses, queryAttendance, queryStudents } from '@/lib/supabase';
import { getSchoolIdFromRequest, validateSchoolIdAccess } from '@/lib/auth-utils';

export async function GET(request: NextRequest) {
  try {
    const schoolId = await getSchoolIdFromRequest(request);
    if (!schoolId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const accessError = await validateSchoolIdAccess(schoolId);
    if (accessError) {
      return NextResponse.json({ error: accessError }, { status: 403 });
    }

    // Get all classes
    const { data: classes, error: classError } = await queryClasses()
      .select('id, class_name')
      .eq('school_id', schoolId);

    if (classError || !classes || classes.length === 0) {
      return NextResponse.json({ data: [] });
    }

    // Get attendance for past 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const attendanceData = [];

    for (const classItem of classes) {
      // Get students in class
      const { data: students } = await queryStudents()
        .select('id')
        .eq('class_id', classItem.id);

      if (!students || students.length === 0) {
        attendanceData.push({
          className: classItem.class_name || 'Unknown Class',
          rate: 0,
        });
        continue;
      }

      const studentIds = students.map((s) => s.id);

      // Get attendance records
      const { data: attendance } = await queryAttendance()
        .select('*')
        .in('student_id', studentIds)
        .gte('date', thirtyDaysAgo.toISOString().split('T')[0]);

      if (!attendance || attendance.length === 0) {
        attendanceData.push({
          className: classItem.class_name || 'Unknown Class',
          rate: 0,
        });
        continue;
      }

      // Calculate rate
      const presentCount = attendance.filter((a) => a.status === 'present').length;
      const rate = (presentCount / attendance.length) * 100;

      attendanceData.push({
        className: classItem.class_name || 'Unknown Class',
        rate: Math.round(rate * 10) / 10,
      });
    }

    // Sort by class name
    attendanceData.sort((a, b) => a.className.localeCompare(b.className));

    return NextResponse.json({ data: attendanceData });
  } catch (err) {
    console.error('[v0] Attendance by class error:', err);
    return NextResponse.json(
      { data: [], error: 'Failed to fetch attendance by class' },
      { status: 500 }
    );
  }
}
