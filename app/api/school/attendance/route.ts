import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { queryAttendance, queryStudents, formatSupabaseError } from '@/lib/supabase';
import { getSchoolIdFromRequest, validateSchoolIdAccess } from '@/lib/auth-utils';

const attendanceRecordSchema = z.object({
  class_id: z.string().uuid(),
  date: z.string().date(),
  attendance: z.array(
    z.object({
      student_id: z.string().uuid(),
      status: z.enum(['present', 'absent', 'late', 'excused']),
    })
  ),
});

export async function GET(request: NextRequest) {
  try {
    const classId = request.nextUrl.searchParams.get('class_id');
    const date = request.nextUrl.searchParams.get('date');
    const schoolId = await getSchoolIdFromRequest(request);

    if (!classId || !date) {
      return NextResponse.json(
        { error: 'Class ID and date are required' },
        { status: 400 }
      );
    }

    // Type guard to ensure schoolId is a string
    if (typeof schoolId !== 'string') {
      return NextResponse.json(
        { error: 'Invalid school ID' },
        { status: 400 }
      );
    }

    // Validate school_id access
    const validation = await validateSchoolIdAccess(schoolId);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error || 'Invalid school access' },
        { status: 400 }
      );
    }

    // Fetch students in the class
    const { data: students, error: studentError } = await queryStudents()
      .select('id, first_name, last_name')
      .eq('school_id', schoolId)
      .eq('current_class_id', classId)
      .eq('status', 'active');

    if (studentError) {
      throw studentError;
    }

    // Fetch existing attendance records
    const { data: existingRecords } = await queryAttendance()
      .select('student_id, status')
      .eq('school_id', schoolId)
      .eq('class_id', classId)
      .eq('date', date);

    const recordMap = new Map(
      (existingRecords || []).map((r: any) => [r.student_id, r.status])
    );

    const attendanceData = (students || []).map((student: any) => ({
      student_id: student.id,
      student_name: `${student.first_name} ${student.last_name}`,
      status: recordMap.get(student.id) || null,
    }));

    return NextResponse.json({ students: attendanceData, total: attendanceData.length });
  } catch (error) {
    console.error('[v0] Attendance GET error:', error);
    return NextResponse.json({ error: formatSupabaseError(error) }, { status: 400 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const schoolId = await getSchoolIdFromRequest(request);
    if (!schoolId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const accessError = await validateSchoolIdAccess(schoolId);
    if (accessError) {
      return NextResponse.json({ error: accessError }, { status: 403 });
    }

    const body = await request.json();

    const { date, class_id, records } = z.object({
      date: z.string().date(),
      class_id: z.string().uuid(),
      records: z.array(
        z.object({
          studentId: z.string().uuid(),
          studentName: z.string(),
          status: z.enum(['present', 'absent', 'leave']),
        })
      ),
    }).parse(body);

    // Insert attendance records
    const attendanceRecords = records.map((record) => ({
      school_id: schoolId,
      student_id: record.studentId,
      date,
      status: record.status,
      class_id,
      created_at: new Date().toISOString(),
    }));

    const { error } = await queryAttendance().insert(attendanceRecords);

    if (error) {
      console.error('[v0] Attendance POST error:', error);
      return NextResponse.json({ error: formatSupabaseError(error) }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      count: attendanceRecords.length,
      message: `Successfully recorded attendance for ${attendanceRecords.length} students`,
    });
  } catch (error) {
    console.error('[v0] Attendance POST error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      { error: 'Failed to save attendance' },
      { status: 500 }
    );
  }
}
