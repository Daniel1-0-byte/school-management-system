import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { queryStudents, formatSupabaseError } from '@/lib/supabase';
import { getSchoolIdFromRequest, validateSchoolIdAccess } from '@/lib/auth-utils';

const studentUpdateSchema = z.object({
  first_name: z.string().min(1).optional(),
  last_name: z.string().min(1).optional(),
  date_of_birth: z.string().optional(),
  admission_number: z.string().optional(),
  current_class_id: z.string().uuid().optional(),
  status: z.enum(['active', 'inactive', 'graduated']).optional(),
  parental_status: z.string().optional(),
  medical_notes: z.string().optional(),
  allergies: z.string().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const schoolId = getSchoolIdFromRequest(request);

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
      .eq('school_id', schoolId!)
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
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const validatedData = studentUpdateSchema.parse(body);
    const schoolId = getSchoolIdFromRequest(request);

    // Validate school_id access
    const validation = await validateSchoolIdAccess(schoolId);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error || 'Invalid school access' },
        { status: 400 }
      );
    }

    const { data, error } = await queryStudents()
      .update(validatedData)
      .eq('id', id)
      .eq('school_id', schoolId!)
      .select()
      .single();

    if (error) {
      console.error('[v0] Student PUT error:', error);
      return NextResponse.json({ error: formatSupabaseError(error) }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('[v0] Student PUT error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to update student' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const schoolId = getSchoolIdFromRequest(request);

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
      .eq('school_id', schoolId!);

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
