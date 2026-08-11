import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { formatSupabaseError, getServerSupabaseClient, queryAttendance, queryClasses, queryStudents } from '@/lib/supabase';
import { getSchoolIdFromRequest, validateSchoolIdAccess } from '@/lib/auth-utils';

const dateSchema = z.string().date();
const statusSchema = z.enum(['present', 'absent', 'leave']);
const saveSchema = z.object({
  classId: z.string().uuid(),
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
    const classId = request.nextUrl.searchParams.get('class_id');
    const termId = request.nextUrl.searchParams.get('term_id');
    const date = request.nextUrl.searchParams.get('date');

    if (typeof schoolId !== 'string') return NextResponse.json({ error: 'Invalid school ID' }, { status: 400 });
    if (!classId || !termId || typeof date !== 'string' || !dateSchema.safeParse(date).success) {
      return NextResponse.json({ error: 'class_id, term_id, and a valid date are required' }, { status: 400 });
    }
    const validation = await validateSchoolIdAccess(schoolId);
    if (!validation.valid) return NextResponse.json({ error: validation.error || 'Invalid school access' }, { status: 403 });

    const { data: term, error: termError } = await getTermForDate(schoolId, date, termId);
    if (termError || !term) return NextResponse.json({ error: 'Selected date is outside the selected term' }, { status: 400 });
    if (date < term.start_date || date > term.end_date) return NextResponse.json({ error: 'Selected date is outside the selected term' }, { status: 400 });

    const classQuery = queryClasses()
      .select('id, class_name, grade_level, section, academic_year_id, status')
      .eq('id', classId)
      .eq('school_id', schoolId)
      .maybeSingle();
    const legacyClassQuery = getServerSupabaseClient()
      .from('classes')
      .select('id, name, level, academic_year_id')
      .eq('id', classId)
      .eq('school_id', schoolId)
      .maybeSingle();
    const [{ data: classRow, error: classError }, { data: legacyClassRow, error: legacyClassError }, { data: students, error: studentError }, { data: existingRecords, error: attendanceError }] = await Promise.all([
      classQuery,
      legacyClassQuery,
      queryStudents().select('id, first_name, last_name').eq('school_id', schoolId).eq('current_class_id', classId).eq('status', 'active').order('last_name').order('first_name'),
      queryAttendance().select('student_id, status, remarks').eq('school_id', schoolId).eq('class_id', classId).eq('term_id', term.id).eq('date', date),
    ]);
    const resolvedClass = classRow || (legacyClassRow ? {
      id: legacyClassRow.id,
      class_name: legacyClassRow.name,
      grade_level: legacyClassRow.level,
      section: null,
      academic_year_id: legacyClassRow.academic_year_id,
      status: 'active',
    } : null);
    if ((classError && !legacyClassRow) || (legacyClassError && !classRow) || !resolvedClass) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }
    if (studentError || attendanceError) throw studentError || attendanceError;

    const recordMap = new Map((existingRecords || []).map((record: any) => [record.student_id, record]));
    const attendanceStudents = (students || []).map((student: any) => {
      const record = recordMap.get(student.id);
      return { studentId: student.id, studentName: `${student.first_name} ${student.last_name}`.trim(), status: record?.status || 'not-marked', remarks: record?.remarks || '' };
    });

    return NextResponse.json({
      students: attendanceStudents,
      term,
      class: {
        id: resolvedClass.id,
        name: resolvedClass.class_name,
        gradeLevel: resolvedClass.grade_level,
        section: resolvedClass.section,
        academicYearId: resolvedClass.academic_year_id,
        status: resolvedClass.status,
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
    if (typeof schoolId !== 'string') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const validation = await validateSchoolIdAccess(schoolId);
    if (!validation.valid) return NextResponse.json({ error: validation.error || 'Invalid school access' }, { status: 403 });

    const body = saveSchema.parse(await request.json());
    const { data: term } = await getTermForDate(schoolId, body.date, body.termId);
    if (!term || body.date < term.start_date || body.date > term.end_date) return NextResponse.json({ error: 'Attendance date is outside the selected term' }, { status: 400 });

    const client = getServerSupabaseClient();
    const { data: validStudents } = await queryStudents().select('id').eq('school_id', schoolId).eq('current_class_id', body.classId).eq('status', 'active').in('id', body.records.map((record) => record.studentId));
    const validIds = new Set((validStudents || []).map((student: any) => student.id));
    const records = body.records.filter((record) => validIds.has(record.studentId));
    const savedAt = new Date().toISOString();

    for (const record of records) {
      const payload = { school_id: schoolId, student_id: record.studentId, class_id: body.classId, term_id: term.id, date: body.date, status: record.status, remarks: record.remarks || '', updated_at: savedAt };
      const { data: existing } = await client.from('attendance_records').select('id').eq('school_id', schoolId).eq('student_id', record.studentId).eq('class_id', body.classId).eq('term_id', term.id).eq('date', body.date).maybeSingle();
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
