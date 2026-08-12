import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { formatSupabaseError, getServerSupabaseClient, queryAttendance } from '@/lib/supabase';
import { getSchoolIdFromRequest, validateSchoolIdAccess, getUserIdFromRequest } from '@/lib/auth-utils';

const dateSchema = z.string().date();
const statusSchema = z.enum(['present', 'absent', 'holiday']);
const saveSchema = z.object({
  streamId: z.string().uuid(),
  termId: z.string().uuid().optional(),
  date: dateSchema,
  records: z.array(z.object({
    studentId: z.string().uuid(),
    status: statusSchema,
    remarks: z.string().max(500).optional().default(''),
  })),
});

async function getTermForDate(schoolId: string, date: string, termId?: string) {
  let query = getServerSupabaseClient()
    .from('terms')
    .select('id, academic_year_id, type, start_date, end_date')
    .eq('school_id', schoolId);

  if (termId) query = query.eq('id', termId);
  else query = query.lte('start_date', date).gte('end_date', date);

  return query.maybeSingle();
}

export async function GET(request: NextRequest) {
  try {
    const schoolId = await getSchoolIdFromRequest(request);
    const streamId = request.nextUrl.searchParams.get('stream_id');
    const termId = request.nextUrl.searchParams.get('term_id');
    const date = request.nextUrl.searchParams.get('date');

    console.log('[v0] Attendance GET request:', { schoolId, streamId, termId, date });

    if (typeof schoolId !== 'string') return NextResponse.json({ error: 'Invalid school ID' }, { status: 400 });
    if (!streamId || !termId || typeof date !== 'string' || !dateSchema.safeParse(date).success) {
      return NextResponse.json({ error: 'stream_id, term_id, and a valid date are required' }, { status: 400 });
    }
    const day = new Date(`${date}T00:00:00Z`).getUTCDay();
    if (day === 0 || day === 6) return NextResponse.json({ error: 'Attendance cannot be recorded on weekends' }, { status: 400 });
    const validation = await validateSchoolIdAccess(schoolId);
    if (!validation.valid) return NextResponse.json({ error: validation.error || 'Invalid school access' }, { status: 403 });

    const { data: term, error: termError } = await getTermForDate(schoolId, date, termId);
    console.log('[v0] Attendance term lookup:', { schoolId, termId, date, term, termError: termError ? formatSupabaseError(termError) : null });
    if (termError || !term) return NextResponse.json({ error: 'Selected date is outside the selected term' }, { status: 400 });
    if (date < term.start_date || date > term.end_date) return NextResponse.json({ error: 'Selected date is outside the selected term' }, { status: 400 });

    const { data: stream, error: streamError } = await getServerSupabaseClient()
      .from('school_class_streams')
      .select('id, name, school_class_id, academic_year_id, school_classes(name, level)')
      .eq('id', streamId)
      .eq('school_id', schoolId)
      .eq('academic_year_id', term.academic_year_id)
      .maybeSingle();
    if (streamError || !stream) return NextResponse.json({ error: 'Stream not found' }, { status: 404 });

    const [{ data: enrollments, error: enrollmentError }, { data: existingRecords, error: attendanceError }] = await Promise.all([
      getServerSupabaseClient().from('student_enrollments').select('student_id, students(first_name, last_name, gender)').eq('school_id', schoolId).eq('academic_year_id', term.academic_year_id).eq('class_id', stream.school_class_id).eq('stream_id', stream.id).eq('status', 'active'),
      queryAttendance().select('student_id, status, remarks').eq('school_id', schoolId).eq('class_id', stream.school_class_id).eq('term_id', term.id).eq('date', date),
    ]);
    const students = (enrollments || []).map((enrollment: any) => ({ id: enrollment.student_id, first_name: enrollment.students?.first_name || '', last_name: enrollment.students?.last_name || '', gender: enrollment.students?.gender ?? null }));
    const studentError = enrollmentError;
    console.log('[v0] Attendance class lookup:', {
      requestedStreamId: streamId,
      schoolId,
      stream,
      streamError: streamError ? formatSupabaseError(streamError) : null,
      enrollmentError: enrollmentError ? formatSupabaseError(enrollmentError) : null,
      studentCount: students?.length ?? 0,
      studentError: studentError ? formatSupabaseError(studentError) : null,
      attendanceRecordCount: existingRecords?.length ?? 0,
      attendanceError: attendanceError ? formatSupabaseError(attendanceError) : null,
    });

    if (studentError || attendanceError) throw studentError || attendanceError;

    const recordMap = new Map((existingRecords || []).map((record: any) => [record.student_id, record]));
    const attendanceStudents = (students || []).map((student: any) => {
      const record = recordMap.get(student.id);
      return { studentId: student.id, studentName: `${student.first_name} ${student.last_name}`.trim(), firstName: student.first_name, lastName: student.last_name, gender: student.gender, status: record?.status || 'not-marked', remarks: record?.remarks || '' };
    });

    return NextResponse.json({
      students: attendanceStudents,
      term,
      class: {
        id: stream.id,
        name: stream.name,
        className: (stream.school_classes as any)?.name || (stream.school_classes as any)?.level || 'Class',
        academicYearId: stream.academic_year_id,
      },
      canEdit: true,
    });
  } catch (error) {
    console.error('[v0] Attendance GET error:', error);
    return NextResponse.json({ error: formatSupabaseError(error) }, { status: 400 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const schoolId = await getSchoolIdFromRequest(request);
    const authenticatedUserId = getUserIdFromRequest(request);
    if (typeof schoolId !== 'string') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!authenticatedUserId) return NextResponse.json({ error: 'User authentication required' }, { status: 401 });
    const validation = await validateSchoolIdAccess(schoolId);
    if (!validation.valid) return NextResponse.json({ error: validation.error || 'Invalid school access' }, { status: 403 });

    const body = saveSchema.parse(await request.json());
    const day = new Date(`${body.date}T00:00:00Z`).getUTCDay();
    if (day === 0 || day === 6) return NextResponse.json({ error: 'Attendance cannot be recorded on weekends' }, { status: 400 });
    const { data: term } = await getTermForDate(schoolId, body.date, body.termId);
    if (!term || body.date < term.start_date || body.date > term.end_date) return NextResponse.json({ error: 'Attendance date is outside the selected term' }, { status: 400 });

    const client = getServerSupabaseClient();
    const { data: stream } = await client.from('school_class_streams').select('id, school_class_id, academic_year_id').eq('id', body.streamId).eq('school_id', schoolId).eq('academic_year_id', term.academic_year_id).maybeSingle();
    if (!stream) return NextResponse.json({ error: 'Stream not found' }, { status: 404 });
    const { data: validStudents } = await client.from('student_enrollments').select('student_id').eq('school_id', schoolId).eq('academic_year_id', term.academic_year_id).eq('class_id', stream.school_class_id).eq('stream_id', stream.id).eq('status', 'active').in('student_id', body.records.map((record) => record.studentId));
    const validIds = new Set((validStudents || []).map((student: any) => student.student_id));
    const records = body.records.filter((record) => validIds.has(record.studentId));
    const savedAt = new Date().toISOString();

    for (const record of records) {
      const payload = { school_id: schoolId, student_id: record.studentId, class_id: stream.school_class_id, term_id: term.id, date: body.date, status: record.status, remarks: record.remarks || '', recorded_by: authenticatedUserId, updated_at: savedAt };
      const { data: existing } = await client.from('attendance_records').select('id').eq('school_id', schoolId).eq('student_id', record.studentId).eq('class_id', stream.school_class_id).eq('term_id', term.id).eq('date', body.date).maybeSingle();
      const result = existing?.id ? await client.from('attendance_records').update(payload).eq('id', existing.id) : await client.from('attendance_records').insert({ ...payload, created_at: savedAt });
      if (result.error) throw result.error;
    }

    return NextResponse.json({ success: true, count: records.length, savedAt });
  } catch (error) {
    console.error('[v0] Attendance POST error:', error);
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'Invalid attendance data', details: error.issues }, { status: 400 });
    return NextResponse.json({ error: formatSupabaseError(error) }, { status: 400 });
  }
}
