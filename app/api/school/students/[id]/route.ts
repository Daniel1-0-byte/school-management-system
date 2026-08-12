import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  queryStudents,
  queryStudentEnrollments,
  querySchoolClassStreams,
  queryAcademicYears,
  formatSupabaseError,
} from '@/lib/supabase';
import { getSchoolIdFromRequest, validateSchoolIdAccess, requireRole } from '@/lib/auth-utils';

const studentUpdateSchema = z.object({
  first_name: z.string().min(1).optional(),
  last_name: z.string().min(1).optional(),
  gender: z.enum(['male', 'female']).optional(),
  date_of_birth: z.string().optional(),
  admission_number: z.string().optional(),
  current_class_id: z.string().uuid().nullable().optional(),
  current_stream_id: z.string().uuid().nullable().optional(),
  status: z.enum(['active', 'inactive', 'graduated']).optional(),
  parental_status: z.string().optional(),
  medical_notes: z.string().optional(),
  allergies: z.string().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const roleError = await requireRole(request, ['Admin']);
  if (roleError) return roleError;
  try {
    const { id } = await params;
    console.log('[GET] id:', id);
    const schoolId = await getSchoolIdFromRequest(request);

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

    const { data, error } = await queryStudents()
      .select('*')
      .eq('id', id)
      .eq('school_id', schoolId)
      .single();

    if (error) {
      console.error('[v0] Student GET error:', error);
      return NextResponse.json({ error: formatSupabaseError(error) }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('[v0] Student GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch student' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const roleError = await requireRole(request, ['Admin']);
  if (roleError) return roleError;
  try {
    const { id } = await params;
    console.log('[PUT] id:', id);
    const body = await request.json();
    const validatedData = studentUpdateSchema.parse(body);
    const schoolId = await getSchoolIdFromRequest(request);

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

    const { current_stream_id: currentStreamId, ...studentData } = validatedData;

    const { data, error } = await queryStudents()
      .update(studentData)
      .eq('id', id)
      .eq('school_id', schoolId)
      .select()
      .single();

    if (error) {
      console.error('[v0] Student PUT error:', error);
      return NextResponse.json({ error: formatSupabaseError(error) }, { status: 400 });
    }

    if (currentStreamId) {
      const { data: stream, error: streamError } = await querySchoolClassStreams()
        .select('id, school_class_id')
        .eq('id', currentStreamId)
        .eq('school_id', schoolId)
        .maybeSingle();

      if (streamError || !stream) {
        return NextResponse.json(
          { error: streamError ? formatSupabaseError(streamError) : 'Selected stream was not found' },
          { status: 400 }
        );
      }

      const { data: academicYear, error: academicYearError } = await queryAcademicYears()
        .select('id')
        .eq('school_id', schoolId)
        .order('start_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (academicYearError || !academicYear) {
        return NextResponse.json(
          { error: academicYearError ? formatSupabaseError(academicYearError) : 'No academic year found' },
          { status: 400 }
        );
      }

      const { data: enrollment, error: enrollmentError } = await queryStudentEnrollments()
        .select('id')
        .eq('student_id', id)
        .eq('school_id', schoolId)
        .eq('status', 'active')
        .maybeSingle();

      if (enrollmentError) {
        return NextResponse.json({ error: formatSupabaseError(enrollmentError) }, { status: 400 });
      }

      const enrollmentPayload = {
        student_id: id,
        school_id: schoolId,
        class_id: stream.school_class_id,
        stream_id: currentStreamId,
        academic_year_id: academicYear.id,
        enrollment_date: new Date().toISOString().slice(0, 10),
        status: 'active',
      };

      const { error: saveEnrollmentError } = enrollment
        ? await queryStudentEnrollments().update(enrollmentPayload).eq('id', enrollment.id)
        : await queryStudentEnrollments().insert(enrollmentPayload);

      if (saveEnrollmentError) {
        return NextResponse.json({ error: formatSupabaseError(saveEnrollmentError) }, { status: 400 });
      }
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('[v0] Student PUT error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to update student' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const roleError = await requireRole(request, ['Admin']);
  if (roleError) return roleError;
  try {
    const { id } = await params;
    console.log('[DELETE] id:', id);
    const schoolId = await getSchoolIdFromRequest(request);

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

    const { error } = await queryStudents()
      .delete()
      .eq('id', id)
      .eq('school_id', schoolId);

    if (error) {
      console.error('[v0] Student DELETE error:', error);
      return NextResponse.json({ error: formatSupabaseError(error) }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[v0] Student DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete student' }, { status: 500 });
  }
}
