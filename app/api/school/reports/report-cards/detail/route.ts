import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabaseClient } from '@/lib/supabase';
import { getSchoolIdFromRequest, validateSchoolIdAccess, requireRole } from '@/lib/auth-utils';
import type { ReportCardData } from '@/components/reports/professional-report-card';

/**
 * GET /api/school/reports/report-cards/detail
 * Fetch complete report card data for display/printing
 * 
 * Query params:
 * - student_id: UUID
 * - term_id: UUID
 * - academic_year_id: UUID
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

    const studentId = request.nextUrl.searchParams.get('student_id');
    const termId = request.nextUrl.searchParams.get('term_id');
    const academicYearId = request.nextUrl.searchParams.get('academic_year_id');

    if (!studentId || !termId || !academicYearId) {
      return NextResponse.json(
        { error: 'student_id, term_id, and academic_year_id are required' },
        { status: 400 }
      );
    }

    const supabase = getServerSupabaseClient();

    // Fetch school information
    const { data: school, error: schoolError } = await supabase
      .from('schools')
      .select('name, logo_url, address, phone, email, website, principal_name')
      .eq('id', schoolId)
      .single();

    if (schoolError || !school) {
      return NextResponse.json({ error: 'School not found' }, { status: 404 });
    }

    // Fetch student information
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id, first_name, last_name, admission_number')
      .eq('id', studentId)
      .eq('school_id', schoolId)
      .single();

    if (studentError || !student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // Fetch enrollment information to get class
    console.log('[v0] Report card enrollment lookup:', {
      studentId,
      schoolId,
      academicYearId,
    });

    const { data: enrollment, error: enrollmentError } = await supabase
      .from('student_enrollments')
      .select('class_id')
      .eq('student_id', studentId)
      .eq('school_id', schoolId)
      .eq('academic_year_id', academicYearId)
      .eq('status', 'active')
      .single();

    if (enrollmentError || !enrollment) {
      return NextResponse.json({ error: 'Student enrollment not found' }, { status: 404 });
    }

    // Fetch stream information (class details)
    const { data: stream, error: streamError } = await supabase
      .from('school_class_streams')
      .select('name, class_teacher_id, school_class_id')
      .eq('school_id', schoolId)
      .eq('academic_year_id', academicYearId)
      .eq('school_class_id', enrollment.class_id)
      .order('class_teacher_id', { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();

    if (streamError || !stream) {
      return NextResponse.json({ error: 'Stream not found' }, { status: 404 });
    }
    if (streamError) {
      console.error('[v0] Error fetching report stream:', streamError);
    }

    // Fetch class information
    const { data: schoolClass, error: classError } = await supabase
      .from('school_classes')
      .select('name')
      .eq('id', enrollment.class_id)
      .single();

    if (classError || !schoolClass) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }

    // Fetch term information
    const { data: term, error: termError } = await supabase
      .from('terms')
      .select('type')
      .eq('id', termId)
      .single();

    if (termError || !term) {
      return NextResponse.json({ error: 'Term not found' }, { status: 404 });
    }

    // Fetch academic year information
    console.log('[v0] Report card academic year lookup:', {
      academicYearId,
      schoolId,
    });

    const { data: academicYear, error: yearError } = await supabase
      .from('academic_years')
      .select('year, school_id, start_date')
      .eq('id', academicYearId)
      .eq('school_id', schoolId)
      .single();

    if (yearError || !academicYear) {
      return NextResponse.json({ error: 'Academic year not found' }, { status: 404 });
    }

    // Fetch report card
    const { data: reportCard, error: reportCardError } = await supabase
      .from('report_cards')
      .select('total_score, average_score, letter_grade, ranking, class_size, teacher_comment, conduct_comment, talent_interests, head_teacher_comment, principal_signature, generated_at, present_days, absent_days, total_school_days')
      .eq('student_id', studentId)
      .eq('term_id', termId)
      .eq('academic_year_id', academicYearId)
      .eq('school_id', schoolId)
      .single();

    if (reportCardError || !reportCard) {
      return NextResponse.json({ error: 'Report card not found' }, { status: 404 });
    }

    // Fetch grade entries (subjects and scores)
    const { data: gradeEntries, error: gradesError } = await supabase
      .from('grade_entries')
      .select('subject_id, total_score, letter_grade, class_score, exam_score, assessment_id, remarks')
      .eq('student_id', studentId)
      .eq('term_id', termId);

    if (gradesError) {
      console.error('[v0] Error fetching grades:', gradesError);
      return NextResponse.json({ error: 'Failed to fetch grades' }, { status: 500 });
    }

    // Fetch subject names
    const subjectIds = gradeEntries?.map(g => g.subject_id) || [];
    const { data: subjects, error: subjectsError } = await supabase
      .from('subjects')
      .select('id, name')
      .in('id', subjectIds);

    if (subjectsError) {
      console.error('[v0] Error fetching subjects:', subjectsError);
    }

    const subjectMap = new Map(subjects?.map(s => [s.id, s.name]) || []);

    // Fetch attendance
    const { data: attendanceRecords, error: attendanceError } = await supabase
      .from('attendance_records')
      .select('status, date')
      .eq('student_id', studentId)
      .gte('date', reportCard.generated_at || new Date().toISOString());

    // Fetch the primary class teacher and optional signature for this class/year.
    const { data: primaryAssignment, error: teacherError } = await supabase
      .from('teacher_assignments')
      .select('teacher_id, profiles!teacher_assignments_teacher_id_fkey(first_name, last_name, signature_url)')
      .eq('school_id', schoolId)
      .eq('class_id', enrollment.class_id)
      .eq('academic_year_id', academicYearId)
      .eq('is_primary_teacher', true)
      .is('end_date', null)
      .order('start_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (teacherError) {
      console.error('[v0] Error fetching primary class teacher:', teacherError);
    }
    const classTeacher = Array.isArray(primaryAssignment?.profiles)
      ? primaryAssignment.profiles[0] ?? null
      : primaryAssignment?.profiles ?? null;
    const classTeacherSignature = classTeacher?.signature_url
      ? (await supabase.storage.from('teacher-signatures').createSignedUrl(classTeacher.signature_url, 3600)).data?.signedUrl || null
      : null;

    // Fetch headteacher (admin) with signature
    const { data: headteacher, error: headteacherError } = await supabase
      .from('profiles')
      .select('first_name, last_name, signature_url')
      .eq('school_id', schoolId)
      .eq('system_role', 'Admin')
      .single();

    if (headteacherError) {
      console.error('[v0] Error fetching headteacher:', headteacherError);
    }

    // Prefer saved attendance overrides; fall back to the live attendance calculation.
    const savedAttendance = reportCard.present_days !== null &&
      reportCard.present_days !== undefined &&
      reportCard.absent_days !== null &&
      reportCard.absent_days !== undefined &&
      reportCard.total_school_days !== null &&
      reportCard.total_school_days !== undefined
      ? {
          present: reportCard.present_days,
          absent: reportCard.absent_days,
          total: reportCard.total_school_days,
        }
      : attendanceRecords
        ? (() => {
          const holidayDays = new Set(
            attendanceRecords.filter((record) => record.status === 'holiday').map((record) => record.date),
          ).size;
          const eligibleRecords = attendanceRecords.filter((record) => record.status !== 'holiday');
          return {
            present: eligibleRecords.filter((record) => record.status === 'present').length,
            absent: eligibleRecords.filter((record) => record.status === 'absent').length,
            total: Math.max(0, attendanceRecords.length - holidayDays),
          };
        })()
        : undefined;

    const reportSubjectIds = (gradeEntries || []).map((entry) => entry.subject_id);
    const { data: classGradeEntries } = await supabase
      .from('grade_entries')
      .select('student_id, subject_id, total_score')
      .eq('school_id', schoolId)
      .eq('term_id', termId)
      .in('subject_id', reportSubjectIds);

    const subjectPositions = new Map<string, number | null>();
    for (const subjectId of reportSubjectIds) {
      const scores = (classGradeEntries || [])
        .filter((entry) => entry.subject_id === subjectId)
        .sort((a, b) => (b.total_score || 0) - (a.total_score || 0));
      const position = scores.findIndex((entry) => entry.student_id === studentId);
      subjectPositions.set(subjectId, position >= 0 ? position + 1 : null);
    }

    const headteacherSignature = headteacher?.signature_url
      ? (await supabase.storage.from('teacher-signatures').createSignedUrl(headteacher.signature_url, 3600)).data?.signedUrl || headteacher.signature_url
      : null;

    const { data: gradingPolicy } = await supabase
      .from('school_grading_policies')
      .select('class_score_weight, exam_score_weight')
      .eq('school_id', schoolId)
      .maybeSingle();
    const classWeight = (gradingPolicy?.class_score_weight ?? 30) / 100;
    const examWeight = (gradingPolicy?.exam_score_weight ?? 70) / 100;

    // Build response
    const reportCardData: ReportCardData = {
      // School Info
      schoolName: school.name,
      schoolLogo: school.logo_url,
      schoolAddress: school.address,
      schoolPhone: school.phone,
      schoolEmail: school.email,
      schoolWebsite: school.website,

      // Student Info
      studentName: `${student.first_name} ${student.last_name}`,
      studentId: student.admission_number || student.id,
      className: schoolClass.name,
      streamName: stream.name,
      academicYear: academicYear.year,
      termName: term.type,

      // Academic Performance
      subjects:
        gradeEntries?.map(g => ({
          name: subjectMap.get(g.subject_id) || 'Unknown Subject',
          score: g.total_score ?? 0,
          classScore: (g.class_score ?? 0) * classWeight,
          examScore: (g.exam_score ?? 0) * examWeight,
          grade: g.letter_grade || 'N/A',
          position: subjectPositions.get(g.subject_id) ?? null,
          remarks: g.remarks || null,
        })) || [],
      totalScore: reportCard.total_score || 0,
      averageScore: reportCard.average_score || 0,
      letterGrade: reportCard.letter_grade || 'N/A',
      ranking: reportCard.ranking,
      classSize: reportCard.class_size,

      // Attendance
      attendance: savedAttendance,

      // Comments
      teacherComment: reportCard.teacher_comment,
      conductComment: reportCard.conduct_comment,
      talentInterests: reportCard.talent_interests,
      headTeacherComment: reportCard.head_teacher_comment,

      // Staff
  classTeacherName: classTeacher
  ? `${classTeacher.first_name} ${classTeacher.last_name}`
  : null,
  classTeacherSignature,
  headteacherName: headteacher
        ? `${headteacher.first_name} ${headteacher.last_name}`
        : 'Headteacher',
      headteacherSignature,

      // Generated Date
      generatedDate: new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
    };

    return NextResponse.json(reportCardData);
  } catch (error) {
    console.error('[v0] Report card detail API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch report card details' },
      { status: 500 }
    );
  }
}
