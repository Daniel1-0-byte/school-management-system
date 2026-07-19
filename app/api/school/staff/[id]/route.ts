import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { queryProfiles, formatSupabaseError } from '@/lib/supabase';

const staffUpdateSchema = z.object({
  first_name: z.string().min(1).optional(),
  last_name: z.string().min(1).optional(),
  phone_number: z.string().optional(),
  system_role: z.enum(['Teacher', 'Admin', 'Accountant', 'BusCoordinator']).optional(),
  department: z.string().optional(),
  status: z.enum(['active', 'inactive']).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const { data, error } = await queryProfiles()
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('[v0] Staff GET error:', error);
      return NextResponse.json({ error: formatSupabaseError(error) }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('[v0] Staff GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch staff' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const validatedData = staffUpdateSchema.parse(body);

    const { data, error } = await queryProfiles()
      .update(validatedData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[v0] Staff PUT error:', error);
      return NextResponse.json({ error: formatSupabaseError(error) }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('[v0] Staff PUT error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to update staff' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const { error } = await queryProfiles()
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[v0] Staff DELETE error:', error);
      return NextResponse.json({ error: formatSupabaseError(error) }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[v0] Staff DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete staff' }, { status: 500 });
  }
}
