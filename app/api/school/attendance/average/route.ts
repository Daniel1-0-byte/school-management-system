import { NextRequest, NextResponse } from 'next/server';
import { queryAttendance, queryStudents } from '@/lib/supabase';
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

    // Get all students in school
    const { data: students, error: studentError } = await queryStudents()
      .select('id')
      .eq('school_id', schoolId);

    if (studentError || !students || students.length === 0) {
      return NextResponse.json({ average: 0 });
    }

    const studentIds = students.map((s) => s.id);

    // Get attendance records for past 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: attendance, error: attendanceError } = await queryAttendance()
      .select('*')
      .in('student_id', studentIds)
      .gte('date', thirtyDaysAgo.toISOString().split('T')[0]);

    if (attendanceError) {
      return NextResponse.json({ average: 0 });
    }

    if (!attendance || attendance.length === 0) {
      return NextResponse.json({ average: 0 });
    }

    // Calculate attendance rate
    const presentCount = attendance.filter((a) => a.status === 'present').length;
    const totalRecords = attendance.length;
    const average = totalRecords > 0 ? (presentCount / totalRecords) * 100 : 0;

    return NextResponse.json({ average: Math.round(average * 10) / 10 });
  } catch (err) {
    console.error('[v0] Attendance average error:', err);
    return NextResponse.json(
      { error: 'Failed to calculate attendance average', average: 0 },
      { status: 500 }
    );
  }
}
