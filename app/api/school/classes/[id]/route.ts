import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { queryClasses, formatSupabaseError } from '@/lib/supabase';

const classUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  section: z.string().optional(),
  teacher_id: z.string().uuid().optional(),
  room_number: z.string().optional(),
  capacity: z.number().min(1).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const { data, error } = await queryClasses()
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('[v0] Class GET error:', error);
      return NextResponse.json({ error: formatSupabaseError(error) }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('[v0] Class GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch class' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const validatedData = classUpdateSchema.parse(body);

    const { data, error } = await queryClasses()
      .update(validatedData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[v0] Class PUT error:', error);
      return NextResponse.json({ error: formatSupabaseError(error) }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('[v0] Class PUT error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to update class' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const { error } = await queryClasses()
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[v0] Class DELETE error:', error);
      return NextResponse.json({ error: formatSupabaseError(error) }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[v0] Class DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete class' }, { status: 500 });
  }
}
