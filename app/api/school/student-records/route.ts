import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabaseClient } from '@/lib/supabase';
import { getSchoolIdFromRequest, requireRole, validateSchoolIdAccess } from '@/lib/auth-utils';

export async function GET(request: NextRequest) {
  const roleError = await requireRole(request, ['Admin']);
  if (roleError) return roleError;

  const schoolId = await getSchoolIdFromRequest(request);
  if (typeof schoolId !== 'string') return NextResponse.json({ error: 'Invalid school ID' }, { status: 400 });
  const access = await validateSchoolIdAccess(schoolId);
  if (!access.valid) return NextResponse.json({ error: access.error || 'Invalid school access' }, { status: 403 });

  const studentId = request.nextUrl.searchParams.get('student_id');
  const academicYearId = request.nextUrl.searchParams.get('academic_year_id');
  const termId = request.nextUrl.searchParams.get('term_id');
  if (!studentId || !academicYearId) return NextResponse.json({ error: 'student_id and academic_year_id are required' }, { status: 400 });

  const supabase = getServerSupabaseClient();
  const [studentResult, enrollmentResult, termsResult, historyResult] = await Promise.all([
    supabase.from('students').select('id, school_id, first_name, last_name, date_of_birth, admission_number, status, current_class_name, current_class_id, parental_status, medical_notes, allergies, gender, created_at, updated_at').eq('id', studentId).eq('school_id', schoolId).single(),
    supabase.from('student_enrollments').select('id, student_id, class_id, stream_id, academic_year_id, status, enrollment_date, school_classes(id, name, display_order), school_class_streams(id, name)').eq('student_id', studentId).eq('school_id', schoolId).eq('academic_year_id', academicYearId).maybeSingle(),
    supabase.from('terms').select('id, name, start_date, end_date, academic_year_id').eq('school_id', schoolId).eq('academic_year_id', academicYearId).order('start_date'),
    supabase.from('student_enrollments').select('id, class_id, stream_id, academic_year_id, status, enrollment_date, school_classes(name, display_order), school_class_streams(name)').eq('student_id', studentId).eq('school_id', schoolId).order('enrollment_date', { ascending: false }),
  ]);
  if (studentResult.error || !studentResult.data) return NextResponse.json({ error: 'Student not found' }, { status: 404 });
  if (enrollmentResult.error || termsResult.error || historyResult.error) return NextResponse.json({ error: 'Unable to load student records' }, { status: 500 });

  const terms = termsResult.data || [];
  const selectedTerm = termId ? terms.find((term) => term.id === termId) : terms[0];
  if (termId && !selectedTerm) return NextResponse.json({ error: 'Selected term does not belong to the academic year' }, { status: 400 });

  let attendance: any[] = [];
  let grades: any[] = [];
  let reportCards: any[] = [];
  if (selectedTerm) {
    const [attendanceResult, gradesResult, reportsResult] = await Promise.all([
      supabase.from('attendance_records').select('id, date, status, remarks, class_id, term_id').eq('school_id', schoolId).eq('student_id', studentId).eq('term_id', selectedTerm.id).order('date', { ascending: false }),
      supabase.from('grade_entries').select('id, subject_id, score, grade_type, letter_grade, remarks, term_id, subjects(id, name)').eq('school_id', schoolId).eq('student_id', studentId).eq('term_id', selectedTerm.id),
      supabase.from('report_cards').select('*').eq('school_id', schoolId).eq('student_id', studentId).eq('academic_year_id', academicYearId).eq('term_id', selectedTerm.id),
    ]);
    if (attendanceResult.error || gradesResult.error || reportsResult.error) return NextResponse.json({ error: 'Unable to load term records' }, { status: 500 });
    attendance = attendanceResult.data || [];
    grades = gradesResult.data || [];
    reportCards = reportsResult.data || [];
  }

  return NextResponse.json({ student: studentResult.data, enrollment: enrollmentResult.data, terms, selected_term: selectedTerm || null, attendance, grades, report_cards: reportCards, enrollment_history: historyResult.data || [] });
}

export async function POST() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
