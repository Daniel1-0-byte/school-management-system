import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabaseClient } from '@/lib/supabase';
import { getSchoolIdFromRequest, validateSchoolIdAccess } from '@/lib/auth-utils';

/**
 * GET /api/school/grades/completion-status
 * Check if all subjects for a class have completed grade entries
 * 
 * Query params:
 * - academic_year_id: UUID
 * - term_id: UUID
 * - stream_id: UUID (class stream)
 * 
 * Returns:
 * {
 *   "complete": true/false,
 *   "total_subjects": number,
 *   "completed_subjects": number,
 *   "missing_subjects": [{id, name}],
 *   "message": string
 * }
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

    // Get required query parameters
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

    // Step 1: Get the school_class_id from stream
    const { data: streamData, error: streamError } = await supabase
      .from('school_class_streams')
      .select('school_class_id')
      .eq('id', streamId)
      .eq('school_id', schoolId)
      .single();

    if (streamError || !streamData) {
      console.error('[v0] Stream not found:', streamError);
      return NextResponse.json(
        { error: 'Stream not found or does not belong to this school' },
        { status: 404 }
      );
    }

    const schoolClassId = streamData.school_class_id;
    console.log('[debug] stream_id received:', streamId);
    console.log('[debug] resolved class_id:', schoolClassId);
    console.log('[debug] schoolId used:', schoolId);

    // Step 2: Get all subjects assigned to this class (without nested join)
    const { data: classSubjects, error: classSubjectsError } = await supabase
      .from('class_subjects')
      .select('id, subject_id, class_id, school_id')
      .eq('school_id', schoolId)
      .eq('class_id', schoolClassId)
      .order('subject_id');

    console.log('[debug] class_subjects data:', classSubjects);
    console.log('[debug] class_subjects error:', classSubjectsError);

    if (classSubjectsError) {
      console.error('[v0] Error fetching class subjects:', classSubjectsError);
      return NextResponse.json(
        { error: 'Failed to fetch class subjects' },
        { status: 500 }
      );
    }

    if (!classSubjects || classSubjects.length === 0) {
      // No subjects assigned to this class
      return NextResponse.json({
        complete: false,
        total_subjects: 0,
        completed_subjects: 0,
        missing_subjects: [],
        message: 'No subjects assigned to this class. Please configure subjects first.',
      });
    }

    const subjectIds = (classSubjects as any[]).map(cs => cs.subject_id);

    // Step 2b: Get subject names for display
    const { data: subjectsData, error: subjectsError } = await supabase
      .from('subjects')
      .select('id, name, code')
      .in('id', subjectIds);

    if (subjectsError) {
      console.error('[v0] Error fetching subjects:', subjectsError);
    }

    const subjectMap = new Map();
    (subjectsData || []).forEach(s => {
      subjectMap.set(s.id, s);
    });

    // Step 3: Get enrolled students for this class
    // student_enrollments.class_id links students to classes (NOT school_class_id or stream_id)
    // Must filter by academic_year_id to get students enrolled for the selected academic year
    // Must filter by status='active' to only get currently enrolled students
    const { data: enrolledStudents, error: enrollError } = await supabase
      .from('student_enrollments')
      .select('student_id')
      .eq('school_id', schoolId)
      .eq('class_id', schoolClassId)
      .eq('academic_year_id', academicYearId)
      .eq('status', 'active');

    if (enrollError) {
      console.error('[v0] Error fetching enrolled students:', enrollError);
      return NextResponse.json(
        { error: 'Failed to fetch enrolled students' },
        { status: 500 }
      );
    }

    const studentIds = (enrolledStudents || []).map(e => e.student_id);

    // If no students enrolled, consider incomplete
    if (studentIds.length === 0) {
      return NextResponse.json({
        complete: false,
        total_subjects: subjectIds.length,
        completed_subjects: 0,
        missing_subjects: (classSubjects as any[]).map(cs => ({
          id: cs.subject_id,
          name: cs.subjects?.name || 'Unknown',
        })),
        message: 'No students enrolled in this class for the selected term.',
      });
    }

    // Step 4: For each subject, check if grade entries exist for ALL enrolled students
    const completedSubjects: string[] = [];
    const missingSubjects: { id: string; name: string; completedStudents: number }[] = [];

    for (const subjectId of subjectIds) {
      // Count grade entries for this subject and term
      const { data: gradeEntries, error: gradeError } = await supabase
        .from('grade_entries')
        .select('student_id')
        .eq('school_id', schoolId)
        .eq('subject_id', subjectId)
        .eq('term_id', termId)
        .in('student_id', studentIds)
        .not('total_score', 'is', null); // Only count entries with a score

      if (gradeError) {
        console.error('[v0] Error fetching grades for subject', subjectId, ':', gradeError);
        // Assume incomplete if there's an error
        missingSubjects.push({
          id: subjectId,
          name: subjectMap.get(subjectId)?.name || 'Unknown',
          completedStudents: 0,
        });
        continue;
      }

      const completedStudentIds = new Set((gradeEntries || []).map(g => g.student_id));
      const completedCount = completedStudentIds.size;
      const totalStudents = studentIds.length;

      // Subject is complete only if ALL students have grades
      if (completedCount === totalStudents && totalStudents > 0) {
        completedSubjects.push(subjectId);
      } else {
        missingSubjects.push({
          id: subjectId,
          name: subjectMap.get(subjectId)?.name || 'Unknown',
          completedStudents: completedCount,
        });
      }
    }

    const isComplete = completedSubjects.length === subjectIds.length && subjectIds.length > 0;

    return NextResponse.json({
      complete: isComplete,
      total_subjects: subjectIds.length,
      completed_subjects: completedSubjects.length,
      missing_subjects: missingSubjects.map(ms => ({
        id: ms.id,
        name: ms.name,
        progress: `${ms.completedStudents}/${studentIds.length}`,
      })),
      message: isComplete
        ? `All ${subjectIds.length} subjects are complete. Ready to proceed to Reports.`
        : `${completedSubjects.length}/${subjectIds.length} subjects complete. ${missingSubjects.length} subject(s) pending.`,
    });
  } catch (error) {
    console.error('[v0] Grades completion status error:', error);
    return NextResponse.json(
      { error: 'Failed to check grade completion status' },
      { status: 500 }
    );
  }
}
