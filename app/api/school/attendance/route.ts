import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from '@/lib/env';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const attendanceRecordSchema = z.object({
  classId: z.string(),
  date: z.string(),
  attendance: z.array(
    z.object({
      studentId: z.string(),
      status: z.enum(['present', 'absent', 'leave', 'not-marked']),
    })
  ),
});

export async function GET(request: NextRequest) {
  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const classId = request.nextUrl.searchParams.get('classId');
    const date = request.nextUrl.searchParams.get('date');

    if (!classId || !date) {
      return NextResponse.json({ error: 'Class ID and date are required' }, { status: 400 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch students for the class
    const { data: students, error: studentError } = await supabase
      .from('students')
      .select('id, firstName, lastName')
      .eq('class_id', classId)
      .eq('status', 'active');

    if (studentError) throw studentError;

    // Fetch existing attendance records
    const { data: existingRecords } = await supabase
      .from('attendance')
      .select('student_id, status')
      .eq('class_id', classId)
      .eq('marked_date', date);

    const recordMap = new Map(
      (existingRecords || []).map((r) => [r.student_id, r.status])
    );

    const attendanceData = (students || []).map((student) => ({
      studentId: student.id,
      studentName: `${student.firstName} ${student.lastName}`,
      status: recordMap.get(student.id) || 'not-marked',
    }));

    return NextResponse.json({ students: attendanceData });
  } catch (error) {
    console.error('[v0] Attendance GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch attendance' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const body = await request.json();
    const validatedData = attendanceRecordSchema.parse(body);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Delete existing records for the date
    await supabase
      .from('attendance')
      .delete()
      .eq('class_id', validatedData.classId)
      .eq('marked_date', validatedData.date);

    // Insert new records
    const records = validatedData.attendance
      .filter((a) => a.status !== 'not-marked')
      .map((a) => ({
        class_id: validatedData.classId,
        student_id: a.studentId,
        marked_date: validatedData.date,
        status: a.status,
      }));

    if (records.length > 0) {
      const { error } = await supabase.from('attendance').insert(records);
      if (error) throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[v0] Attendance POST error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      { error: 'Failed to save attendance' },
      { status: 500 }
    );
  }
}
