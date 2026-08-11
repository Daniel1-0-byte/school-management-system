import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabaseClient } from '@/lib/supabase';
import { getSchoolIdFromRequest, validateSchoolIdAccess, requireRole } from '@/lib/auth-utils';

interface StudentStatus {
  student_id: string;
  name: string;
  admission_number: string;
  has_report_card: boolean;
  is_complete: boolean;
  missing_requirements: string[];
}

interface BulkValidationResponse {
  total_students: number;
  complete: number;
  incomplete: number;
  students: StudentStatus[];
}

/**
 * POST /api/school/reports/report-cards/bulk-validate
 * Validate that all students in a class/stream have complete report cards
 * 
 * Body:
 * - stream_id: UUID
 * - term_id: UUID
 * - academic_year_id: UUID
 */
export async function POST(request: NextRequest) {
  const roleError = await requireRole(request, ['Admin']);
  if (roleError) return roleError;
  try {
    const schoolId = await getSchoolIdFromRequest(request);

    if (typeof schoolId !== 'string') {
      return NextResponse.json({ error: 'Invalid school ID' }, { status: 400 });
    }

    const validation = await validateSchoolIdAccess(schoolId);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error || 'Invalid school access' }, { status: 403 });
    }

    const body = await request.json();
    const { stream_id, term_id, academic_year_id } = body;

    if (!stream_id || !term_id || !academic_year_id) {
      return NextResponse.json(
        { error: 'stream_id, term_id, and academic_year_id are required' },
        { status: 400 }
      );
    }

    const supabase = getServerSupabaseClient();

    // Fetch stream/class information
    const { data: stream, error: streamError } = await supabase
      .from('school_class_streams')
      .select('school_class_id, name')
      .eq('id', stream_id)
      .eq('school_id', schoolId)
      .single();

    if (streamError || !stream) {
      return NextResponse.json({ error: 'Stream not found' }, { status: 404 });
    }

    // Fetch enrolled students
    const { data: enrollments, error: enrollError } = await supabase
      .from('student_enrollments')
      .select('student_id, students(id, first_name, last_name, admission_number)')
      .eq('school_id', schoolId)
      .eq('class_id', stream.school_class_id)
      .eq('academic_year_id', academic_year_id)
      .eq('status', 'active')
      .order('students(first_name)');

    if (enrollError || !enrollments) {
      return NextResponse.json(
        { error: 'Failed to fetch enrolled students' },
        { status: 500 }
      );
    }

    if (enrollments.length === 0) {
      return NextResponse.json<BulkValidationResponse>({
        total_students: 0,
        complete: 0,
        incomplete: 0,
        students: [],
      });
    }

    // Get existing report cards
    const studentIds = enrollments.map((e: any) => e.student_id);
    const { data: reportCards, error: reportCardsError } = await supabase
      .from('report_cards')
      .select('student_id, total_score, average_score, letter_grade')
      .eq('school_id', schoolId)
      .eq('term_id', term_id)
      .eq('academic_year_id', academic_year_id)
      .in('student_id', studentIds);

    if (reportCardsError) {
      console.error('[v0] Error fetching report cards:', reportCardsError);
    }

    const reportCardMap = new Map(reportCards?.map(rc => [rc.student_id, rc]) || []);

    // Validate each student
    const studentStatuses: StudentStatus[] = [];

    for (const enrollment of enrollments) {
      const student = enrollment.students;
      const reportCard = reportCardMap.get(enrollment.student_id);

      const missing: string[] = [];

      // A report card is complete if it exists and has calculated scores/grades
      // The report card generation process already validates that grades and attendance
      // were available, so we only need to check if the report card has the final data
      if (!reportCard) {
        missing.push('No report card generated');
      } else {
        // Report card exists - check if it has the calculated summary data
        // If total_score, average_score, and letter_grade exist, grades were entered
        const hasGrades = reportCard.total_score !== null && reportCard.average_score !== null;
        if (!hasGrades) {
          missing.push('Report card exists but lacks grade summary data');
        }
      }

      studentStatuses.push({
        student_id: enrollment.student_id,
        name: `${student.first_name} ${student.last_name}`,
        admission_number: student.admission_number || '',
        has_report_card: !!reportCard,
        is_complete: missing.length === 0,
        missing_requirements: missing,
      });
    }

    const completeCount = studentStatuses.filter(s => s.is_complete).length;

    return NextResponse.json<BulkValidationResponse>({
      total_students: studentStatuses.length,
      complete: completeCount,
      incomplete: studentStatuses.length - completeCount,
      students: studentStatuses,
    });
  } catch (error) {
    console.error('[v0] Bulk validation error:', error);
    return NextResponse.json(
      { error: 'Failed to validate report cards' },
      { status: 500 }
    );
  }
}
