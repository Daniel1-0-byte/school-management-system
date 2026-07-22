import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { queryGrades, queryStudents, getPaginatedResults, formatSupabaseError } from '@/lib/supabase';
import { getSchoolIdFromRequest, validateSchoolIdAccess } from '@/lib/auth-utils';

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
    const schoolId = await getSchoolIdFromRequest(request);
    if (!schoolId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const accessError = await validateSchoolIdAccess(schoolId);
    if (accessError) {
      return NextResponse.json({ error: accessError }, { status: 403 });
    }

    const body = await request.json();

    // Support both old single entry format and new bulk format
    if (body.records) {
      // New bulk format from grade form
      const { class_id, subject_id, assessment_type, records } = z.object({
        school_id: z.string().uuid(),
        class_id: z.string().uuid(),
        subject_id: z.string().uuid(),
        assessment_type: z.enum(['exam', 'quiz', 'assignment', 'project']),
        records: z.array(
          z.object({
            studentId: z.string().uuid(),
            studentName: z.string(),
            marks: z.number().min(0).max(100),
            grade: z.string(),
          })
        ),
      }).parse(body);

      const gradeRecords = records.map((record) => ({
        school_id: schoolId,
        student_id: record.studentId,
        subject_id,
        class_id,
        assessment_type,
        marks: record.marks,
        grade: record.grade,
        created_at: new Date().toISOString(),
      }));

      const { error } = await queryGrades().insert(gradeRecords);

      if (error) {
        console.error('[v0] Grades POST error:', error);
        return NextResponse.json({ error: formatSupabaseError(error) }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        count: gradeRecords.length,
        message: `Successfully recorded grades for ${gradeRecords.length} students`,
      });
    } else {
      // Old single entry format
      const validatedData = gradeEntrySchema.parse(body);

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
    }
  } catch (error) {
    console.error('[v0] Grades POST error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
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
    const schoolId = await getSchoolIdFromRequest(request);
    const termId = request.nextUrl.searchParams.get('term_id');
    const studentId = request.nextUrl.searchParams.get('student_id');

    // Type guard to ensure schoolId is a string
    if (typeof schoolId !== 'string') {
      return NextResponse.json(
        { error: 'Invalid school ID' },
        { status: 400 }
      );
    }

    // Validate school_id access
    const validation = await validateSchoolIdAccess(schoolId);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error || 'Invalid school access' },
        { status: 400 }
      );
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
