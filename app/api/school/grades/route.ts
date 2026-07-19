import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { queryGrades, queryStudents, getPaginatedResults, formatSupabaseError } from '@/lib/supabase';

const gradeEntrySchema = z.object({
  student_id: z.string().uuid(),
  term_id: z.string().uuid(),
  subject_id: z.string().uuid(),
  score: z.number().min(0).max(100),
  grade_type: z.enum(['percentage', 'letter', 'point']).default('percentage'),
  letter_grade: z.string().optional(),
  remarks: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = gradeEntrySchema.parse(body);
    const schoolId = request.nextUrl.searchParams.get('school_id');
    const teacherId = request.nextUrl.searchParams.get('teacher_id');

    if (!schoolId || !teacherId) {
      return NextResponse.json(
        { error: 'School ID and teacher ID required' },
        { status: 400 }
      );
    }

    // Determine letter grade based on percentage score
    let letterGrade = validatedData.letter_grade;
    if (!letterGrade && validatedData.grade_type === 'percentage') {
      if (validatedData.score >= 90) letterGrade = 'A';
      else if (validatedData.score >= 80) letterGrade = 'B';
      else if (validatedData.score >= 70) letterGrade = 'C';
      else if (validatedData.score >= 60) letterGrade = 'D';
      else letterGrade = 'F';
    }

    const { data, error } = await queryGrades()
      .insert({
        ...validatedData,
        school_id: schoolId,
        teacher_id: teacherId,
        letter_grade: letterGrade,
        recorded_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('[v0] Grades POST error:', error);
      return NextResponse.json({ error: formatSupabaseError(error) }, { status: 400 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('[v0] Grades POST error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      { error: 'Failed to save grades' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const page = parseInt(request.nextUrl.searchParams.get('page') || '1');
    const pageSize = parseInt(request.nextUrl.searchParams.get('pageSize') || '20');
    const schoolId = request.nextUrl.searchParams.get('school_id');
    const termId = request.nextUrl.searchParams.get('term_id');
    const studentId = request.nextUrl.searchParams.get('student_id');

    if (!schoolId) {
      return NextResponse.json({ error: 'School ID required' }, { status: 400 });
    }

    let query = queryGrades()
      .select('*', { count: 'exact' })
      .eq('school_id', schoolId);

    if (termId) {
      query = query.eq('term_id', termId);
    }

    if (studentId) {
      query = query.eq('student_id', studentId);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error, count } = await getPaginatedResults(query, page, pageSize);

    if (error) {
      console.error('[v0] Grades GET error:', error);
      return NextResponse.json({ error: formatSupabaseError(error) }, { status: 400 });
    }

    return NextResponse.json({
      data: data || [],
      total: count || 0,
      page,
      pageSize,
    });
  } catch (error) {
    console.error('[v0] Grades GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch grades' },
      { status: 500 }
    );
  }
}
