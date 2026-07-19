import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { queryStudents, formatSupabaseError } from '@/lib/supabase';

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

    const { data, error } = await queryStudents()
      .select('*')
      .eq('id', id)
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

    const { data, error } = await queryStudents()
      .update(validatedData)
      .eq('id', id)
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

    const { error } = await queryStudents()
      .delete()
      .eq('id', id);

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
