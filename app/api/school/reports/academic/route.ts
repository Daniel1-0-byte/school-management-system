import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabaseClient } from '@/lib/supabase';
import { getSchoolIdFromRequest, validateSchoolIdAccess } from '@/lib/auth-utils';

/**
 * GET /api/school/reports/academic
 * Fetch academic performance report data
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
      .select('school_class_id')
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

    // Step 2: Get subjects assigned to this class
    const { data: classSubjects, error: classSubjectsError } = await supabase
      .from('class_subjects')
      .select('subject_id, subjects(id, name, code)')
      .eq('school_id', schoolId)
      .eq('class_id', schoolClassId);

    if (classSubjectsError || !classSubjects) {
      return NextResponse.json(
        { error: 'Failed to fetch class subjects' },
        { status: 500 }
      );
    }

    const subjects = classSubjects.map(cs => ({
      id: cs.subject_id,
      name: (cs.subjects as any)?.name || 'Unknown',
    }));

    // Step 3: Get enrolled students for this class
    const { data: enrolledStudents, error: enrollError } = await supabase
      .from('student_enrollments')
      .select('student_id')
      .eq('school_id', schoolId)
      .eq('class_id', schoolClassId)
      .eq('academic_year_id', academicYearId)
      .eq('status', 'active');

    if (enrollError || !enrolledStudents) {
      return NextResponse.json(
        { error: 'Failed to fetch enrolled students' },
        { status: 500 }
      );
    }

    const studentIds = enrolledStudents.map(e => e.student_id);

    if (studentIds.length === 0) {
      return NextResponse.json({
        students: [],
        subjects: subjects,
        summary: {
          classAverage: 0,
          highestScore: 0,
          topPerformers: 0,
          improvement: null,
        },
        gradeDistribution: {},
        subjectPerformance: subjects.map(s => ({ id: s.id, name: s.name, average: 0 })),
      });
    }

    // Step 4: Get student data
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('id, first_name, last_name, admission_number')
      .eq('school_id', schoolId)
      .in('id', studentIds);

    if (studentsError) {
      return NextResponse.json(
        { error: 'Failed to fetch students' },
        { status: 500 }
      );
    }

    // Step 5: Get grade entries for the selected term
    const { data: gradeEntries, error: gradesError } = await supabase
      .from('grade_entries')
      .select('student_id, subject_id, total_score, class_score, exam_score')
      .eq('school_id', schoolId)
      .eq('term_id', termId)
      .in('subject_id', subjects.map(s => s.id))
      .in('student_id', studentIds)
      .not('total_score', 'is', null);

    if (gradesError) {
      return NextResponse.json(
        { error: 'Failed to fetch grades' },
        { status: 500 }
      );
    }

    // Step 6: Process the data
    const studentMap = new Map();
    students?.forEach(s => {
      studentMap.set(s.id, {
        id: s.id,
        name: `${s.first_name} ${s.last_name}`.trim(),
        admissionNumber: s.admission_number,
        subjectScores: {},
      });
    });

    // Map subject data
    const subjectMap = new Map();
    subjects.forEach(s => {
      subjectMap.set(s.id, s);
    });

    // Populate grades
    const allScores: number[] = [];
    gradeEntries?.forEach(ge => {
      if (studentMap.has(ge.student_id)) {
        const student = studentMap.get(ge.student_id);
        student.subjectScores[ge.subject_id] = ge.total_score;
        allScores.push(ge.total_score);
      }
    });

    // Calculate student averages and grades
    const studentData = Array.from(studentMap.values()).map(student => {
      const scores = Object.values(student.subjectScores) as number[];
      const average = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
      
      // Map score to grade (A+: 90+, A: 80-89, B: 70-79, C: 60-69, D: <60)
      let grade = 'F';
      if (average >= 90) grade = 'A+';
      else if (average >= 80) grade = 'A';
      else if (average >= 70) grade = 'B';
      else if (average >= 60) grade = 'C';
      else if (average >= 50) grade = 'D';

      return {
        ...student,
        average: average,
        grade: grade,
      };
    });

    // Calculate class statistics
    const classAverage = allScores.length > 0 ? allScores.reduce((a, b) => a + b, 0) / allScores.length : 0;
    const highestScore = allScores.length > 0 ? Math.max(...allScores) : 0;
    const topPerformers = studentData.filter(s => s.grade === 'A+' || s.grade === 'A').length;

    // Grade distribution
    const gradeDistribution = {
      'A+': studentData.filter(s => s.grade === 'A+').length,
      'A': studentData.filter(s => s.grade === 'A').length,
      'B': studentData.filter(s => s.grade === 'B').length,
      'C': studentData.filter(s => s.grade === 'C').length,
      'D': studentData.filter(s => s.grade === 'D').length,
      'F': studentData.filter(s => s.grade === 'F').length,
    };

    // Subject performance
    const subjectPerformance = subjects.map(subject => {
      const subjectScores = gradeEntries
        ?.filter(ge => ge.subject_id === subject.id && ge.total_score !== null)
        .map(ge => ge.total_score) || [];
      
      const avg = subjectScores.length > 0 ? subjectScores.reduce((a, b) => a + b, 0) / subjectScores.length : 0;
      return { id: subject.id, name: subject.name, average: avg };
    });

    return NextResponse.json({
      students: studentData,
      subjects: subjects,
      summary: {
        classAverage: Math.round(classAverage * 100) / 100,
        highestScore: highestScore,
        topPerformers: topPerformers,
        improvement: null, // TODO: Calculate from previous term data
      },
      gradeDistribution: gradeDistribution,
      subjectPerformance: subjectPerformance,
    });
  } catch (error) {
    console.error('[v0] Academic report error:', error);
    return NextResponse.json(
      { error: 'Failed to generate academic report' },
      { status: 500 }
    );
  }
}
