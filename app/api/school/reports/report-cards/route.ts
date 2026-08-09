import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabaseClient } from '@/lib/supabase';
import { getSchoolIdFromRequest, validateSchoolIdAccess } from '@/lib/auth-utils';

/**
 * GET /api/school/reports/report-cards
 * Fetch report cards data for a specific context
 * 
 * Query params:
 * - academic_year_id: UUID
 * - term_id: UUID
 * - stream_id: UUID
 */
export async function GET(request: NextRequest) {
  try {
    const schoolId = await getSchoolIdFromRequest(request);

    if (typeof schoolId !== 'string') {
      return NextResponse.json({ error: 'Invalid school ID' }, { status: 400 });
    }

    const validation = await validateSchoolIdAccess(schoolId);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error || 'Invalid school access' }, { status: 403 });
    }

    // Get query parameters
    const academicYearId = request.nextUrl.searchParams.get('academic_year_id');
    const termId = request.nextUrl.searchParams.get('term_id');
    const streamId = request.nextUrl.searchParams.get('stream_id');

    if (!academicYearId || !termId || !streamId) {
      return NextResponse.json(
        { error: 'academic_year_id, term_id, and stream_id are required' },
        { status: 400 }
      );
    }

    const supabase = getServerSupabaseClient();

    // Step 1: Resolve stream to class
    const { data: streamData, error: streamError } = await supabase
      .from('school_class_streams')
      .select('school_class_id, name')
      .eq('id', streamId)
      .eq('school_id', schoolId)
      .single();

    if (streamError || !streamData) {
      return NextResponse.json(
        { error: 'Stream not found' },
        { status: 404 }
      );
    }

    const schoolClassId = streamData.school_class_id;
    const streamName = streamData.name;

    // Step 2: Get enrolled students
    const { data: enrolledStudents, error: enrollError } = await supabase
      .from('student_enrollments')
      .select('student_id, students(first_name, last_name, admission_number)')
      .eq('school_id', schoolId)
      .eq('class_id', schoolClassId)
      .eq('academic_year_id', academicYearId)
      .eq('status', 'active')
      .order('students(first_name)');

    if (enrollError || !enrolledStudents) {
      return NextResponse.json(
        { error: 'Failed to fetch enrolled students' },
        { status: 500 }
      );
    }

    if (enrolledStudents.length === 0) {
      return NextResponse.json({
        students: [],
        classSize: 0,
        streamName: streamName,
      });
    }

    // Step 3: Get existing report cards
    const { data: existingReportCards, error: reportCardsError } = await supabase
      .from('report_cards')
      .select('student_id, total_score, average_score, letter_grade, ranking, teacher_comment, conduct, interest, strength, improvement, principal_signature, present_days, absent_days, total_school_days')
      .eq('school_id', schoolId)
      .eq('academic_year_id', academicYearId)
      .eq('term_id', termId);

    if (reportCardsError) {
      console.error('[v0] Error fetching existing report cards:', reportCardsError);
    }

    const reportCardMap = new Map(
      (existingReportCards || []).map(rc => [rc.student_id, rc])
    );

    // Step 4: Get attendance records for the term
    const { data: termData, error: termError } = await supabase
      .from('terms')
      .select('start_date, end_date')
      .eq('id', termId)
      .single();

    if (termError || !termData) {
      return NextResponse.json(
        { error: 'Term not found' },
        { status: 404 }
      );
    }

    // Transform students with report card status
    const students = enrolledStudents.map((enrollment: any) => {
      const student = enrollment.students;
      const studentId = enrollment.student_id;
      const reportCard = reportCardMap.get(studentId);

      return {
        student_id: studentId,
        name: `${student.first_name || ''} ${student.last_name || ''}`.trim(),
        admission_number: student.admission_number || '',
        status: reportCard ? 'completed' : 'pending',
        report_card: reportCard || null,
      };
    });

    return NextResponse.json({
      students,
      classSize: enrolledStudents.length,
      streamName,
      termStartDate: termData.start_date,
      termEndDate: termData.end_date,
    });
  } catch (error) {
    console.error('[v0] Report cards API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch report cards data' },
      { status: 500 }
    );
  }
}
