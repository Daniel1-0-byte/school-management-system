import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabaseClient } from '@/lib/supabase';
import { getSchoolIdFromRequest, validateSchoolIdAccess, requireRole } from '@/lib/auth-utils';

/**
 * GET /api/school/reports/report-cards/student-detail
 * Fetch detailed student data including grades and attendance for report card
 */
export async function GET(request: NextRequest) {
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

    // Get query parameters
    const studentId = request.nextUrl.searchParams.get('student_id');
    const termId = request.nextUrl.searchParams.get('term_id');
    const academicYearId = request.nextUrl.searchParams.get('academic_year_id');
    const streamId = request.nextUrl.searchParams.get('stream_id');

    if (!studentId || !termId || !academicYearId || !streamId) {
      return NextResponse.json(
        { error: 'student_id, term_id, academic_year_id, and stream_id are required' },
        { status: 400 }
      );
    }

    const supabase = getServerSupabaseClient();

    // Step 1: Resolve stream to class
    const { data: streamData, error: streamError } = await supabase
      .from('school_class_streams')
      .select('school_class_id')
      .eq('id', streamId)
      .eq('school_id', schoolId)
      .single();

    if (streamError || !streamData) {
      return NextResponse.json({ error: 'Stream not found' }, { status: 404 });
    }

    const schoolClassId = streamData.school_class_id;

    // Step 2: Get term dates and school operating days
    const { data: termData, error: termError } = await supabase
      .from('terms')
      .select('start_date, end_date')
      .eq('id', termId)
      .eq('school_id', schoolId)
      .single();

    if (termError || !termData) {
      return NextResponse.json({ error: 'Term not found' }, { status: 404 });
    }

    // Step 3: Get student's grades for all subjects
    const { data: gradeData, error: gradeError } = await supabase
      .from('grade_entries')
      .select(`
        subject_id,
        total_score,
        class_score,
        exam_score,
        subjects(id, name, code),
        remarks
      `)
      .eq('school_id', schoolId)
      .eq('student_id', studentId)
      .eq('term_id', termId);

    if (gradeError) {
      console.error('[v0] Error fetching grades:', gradeError);
      return NextResponse.json({ error: 'Failed to fetch grades' }, { status: 500 });
    }

    // Step 4: Get attendance records for the term
    const startDate = new Date(termData.start_date);
    const endDate = new Date(termData.end_date);

    const { data: attendanceData, error: attendanceError } = await supabase
      .from('attendance_records')
      .select('status')
      .eq('school_id', schoolId)
      .eq('student_id', studentId)
      .eq('class_id', schoolClassId)
      .gte('date', termData.start_date)
      .lte('date', termData.end_date);

    if (attendanceError) {
      console.error('[v0] Error fetching attendance:', attendanceError);
    }

    const { data: savedReportCard, error: reportCardError } = await supabase
      .from('report_cards')
      .select('teacher_comment, conduct_comment, talent_interests, head_teacher_comment, present_days, absent_days, total_school_days')
      .eq('school_id', schoolId)
      .eq('student_id', studentId)
      .eq('term_id', termId)
      .eq('academic_year_id', academicYearId)
      .not('present_days', 'is', null)
      .not('absent_days', 'is', null)
      .not('total_school_days', 'is', null)
      .maybeSingle();

    if (reportCardError) {
      console.error('[v0] Error fetching saved report card attendance:', reportCardError);
    }

    // Calculate working days (excluding weekends - assuming 5 day week)
    let workingDays = 0;
    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay();
      // 0 = Sunday, 6 = Saturday
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        workingDays++;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Prefer a complete saved override; otherwise use the live attendance calculation.
    const presentDays = savedReportCard
      ? savedReportCard.present_days
      : (attendanceData || []).filter(a => a.status === 'present').length;
    const absentDays = savedReportCard
      ? savedReportCard.absent_days
      : workingDays - presentDays;
    const totalSchoolDays = savedReportCard?.total_school_days ?? workingDays;

    // Transform grades
    const subjectGrades = (gradeData || []).map(grade => ({
      subject_id: grade.subject_id,
      subject_name: grade.subjects?.name || '',
      class_score: grade.class_score || 0,
      exam_score: grade.exam_score || 0,
      total_score: grade.total_score || 0,
      remarks: grade.remarks || '',
    }));

    // Calculate overall average
    const totalScores = subjectGrades
      .filter(s => s.total_score > 0)
      .map(s => s.total_score);
    
    const overallAverage = totalScores.length > 0
      ? totalScores.reduce((a, b) => a + b, 0) / totalScores.length
      : 0;

    return NextResponse.json({
      attendance: {
        workingDays: totalSchoolDays,
        presentDays,
        absentDays,
      },
      teacherComment: savedReportCard?.teacher_comment ?? '',
      conductComment: savedReportCard?.conduct_comment ?? '',
      talentInterests: savedReportCard?.talent_interests ?? '',
      headTeacherComment: savedReportCard?.head_teacher_comment ?? '',
      subjectGrades,
      overallAverage: overallAverage.toFixed(2),
    });
  } catch (error) {
    console.error('[v0] Student detail API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch student details' },
      { status: 500 }
    );
  }
}
