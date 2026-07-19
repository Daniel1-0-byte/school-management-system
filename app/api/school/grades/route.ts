import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const gradesSchema = z.object({
  classId: z.string(),
  subjectId: z.string(),
  examType: z.string(),
  totalMarks: z.number(),
  grades: z.array(
    z.object({
      studentId: z.string(),
      marksObtained: z.number(),
      grade: z.string(),
      remarks: z.string().optional(),
    })
  ),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = gradesSchema.parse(body);

    // TODO: Save to Supabase
    // For now, just return success
    return NextResponse.json({ success: true, data: validatedData });
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
    const classId = request.nextUrl.searchParams.get('classId');
    const subjectId = request.nextUrl.searchParams.get('subjectId');
    const examType = request.nextUrl.searchParams.get('examType');

    // TODO: Fetch from Supabase
    return NextResponse.json({
      grades: [],
    });
  } catch (error) {
    console.error('[v0] Grades GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch grades' },
      { status: 500 }
    );
  }
}
