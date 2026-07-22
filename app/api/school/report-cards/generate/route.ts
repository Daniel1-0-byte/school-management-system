import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  queryStudents,
  queryClasses,
  queryGrades,
  queryTerms,
  queryAttendance,
  formatSupabaseError,
} from '@/lib/supabase';
import { getSchoolIdFromRequest, validateSchoolIdAccess } from '@/lib/auth-utils';

export async function POST(request: NextRequest) {
  try {
    const schoolId = await getSchoolIdFromRequest(request);
    if (!schoolId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const accessError = await validateSchoolIdAccess(schoolId);
    if (accessError) {
      return NextResponse.json({ error: accessError }, { status: 403 });
    }

    const body = await request.json();
    const { student_id, term_id } = z.object({
      school_id: z.string().uuid(),
      student_id: z.string().uuid(),
      term_id: z.string(),
    }).parse(body);

    // Fetch student
    const { data: student, error: studentError } = await queryStudents()
      .select('*')
      .eq('id', student_id)
      .eq('school_id', schoolId)
      .single();

    if (studentError || !student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // Fetch student's class
    const { data: classData, error: classError } = await queryClasses()
      .select('*')
      .eq('school_id', schoolId)
      .single();

    if (classError || !classData) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }

    // Fetch term
    const { data: term, error: termError } = await queryTerms()
      .select('*')
      .eq('id', term_id)
      .eq('school_id', schoolId)
      .single();

    if (termError || !term) {
      return NextResponse.json({ error: 'Term not found' }, { status: 404 });
    }

    // Fetch grades for the student in this term
    const { data: grades, error: gradesError } = await queryGrades()
      .select('*')
      .eq('student_id', student_id)
      .gte('created_at', term.start_date)
      .lte('created_at', term.end_date);

    if (gradesError) {
      return NextResponse.json({ error: 'Failed to fetch grades' }, { status: 400 });
    }

    // Fetch attendance for the term
    const { data: attendance, error: attendanceError } = await queryAttendance()
      .select('status')
      .eq('student_id', student_id)
      .gte('date', term.start_date)
      .lte('date', term.end_date);

    if (attendanceError) {
      return NextResponse.json({ error: 'Failed to fetch attendance' }, { status: 400 });
    }

    // Calculate attendance
    const presentDays = attendance?.filter((a) => a.status === 'present').length || 0;
    const absentDays = attendance?.filter((a) => a.status === 'absent').length || 0;
    const totalDays = attendance?.length || 0;

    // Process grades by subject
    const subjects: any[] = [];
    const gradesBySubject: { [key: string]: any[] } = {};

    grades?.forEach((grade) => {
      if (!gradesBySubject[grade.subject_id]) {
        gradesBySubject[grade.subject_id] = [];
      }
      gradesBySubject[grade.subject_id].push(grade);
    });

    let totalMarks = 0;
    let subjectCount = 0;

    for (const subjectId in gradesBySubject) {
      const subjectGrades = gradesBySubject[subjectId];
      const avgMarks = subjectGrades.reduce((sum, g) => sum + (g.marks || 0), 0) / subjectGrades.length;
      const avgGrade = subjectGrades[subjectGrades.length - 1]?.grade || 'N/A';

      subjects.push({
        name: `Subject ${subjectId.slice(0, 8)}...`, // Placeholder - would fetch actual subject name
        marks: Math.round(avgMarks),
        grade: avgGrade,
        percentage: Math.round((avgMarks / 100) * 100),
      });

      totalMarks += Math.round(avgMarks);
      subjectCount++;
    }

    // Calculate overall grade
    const overallPercentage = subjectCount > 0 ? totalMarks / subjectCount : 0;
    let overallGrade = 'N/A';
    if (overallPercentage >= 90) overallGrade = 'A';
    else if (overallPercentage >= 80) overallGrade = 'B';
    else if (overallPercentage >= 70) overallGrade = 'C';
    else if (overallPercentage >= 60) overallGrade = 'D';
    else overallGrade = 'F';

    return NextResponse.json({
      student,
      class: classData,
      term,
      subjects,
      attendance: {
        present: presentDays,
        absent: absentDays,
        total: totalDays,
      },
      overallGrade,
      remarks: 'Good performance. Keep up the excellent work!',
      academicYear: '2024-2025',
    });
  } catch (error) {
    console.error('[v0] Report card generation error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to generate report card' },
      { status: 500 }
    );
  }
}
