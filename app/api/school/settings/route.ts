import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { querySchools, formatSupabaseError } from '@/lib/supabase';

const settingsSchema = z.object({
  name: z.string().min(1, 'School name required'),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postal_code: z.string().optional(),
  phone_number: z.string().optional(),
  email: z.string().email('Valid email required'),
  principal_name: z.string().optional(),
  affiliation: z.string().optional(),
  established_year: z.number().optional(),
  website: z.string().url().optional().or(z.literal('')),
});

export async function GET(request: NextRequest) {
  try {
    const schoolId = request.nextUrl.searchParams.get('school_id');

    if (!schoolId) {
      return NextResponse.json({ error: 'School ID required' }, { status: 400 });
    }

    const { data, error } = await querySchools()
      .select('*')
      .eq('id', schoolId)
      .single();

    if (error) {
      console.error('[v0] Settings GET error:', error);
      return NextResponse.json({ error: formatSupabaseError(error) }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('[v0] Settings GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = settingsSchema.parse(body);
    const schoolId = request.nextUrl.searchParams.get('school_id');

    if (!schoolId) {
      return NextResponse.json({ error: 'School ID required' }, { status: 400 });
    }

    const { data, error } = await querySchools()
      .update(validatedData)
      .eq('id', schoolId)
      .select()
      .single();

    if (error) {
      console.error('[v0] Settings PUT error:', error);
      return NextResponse.json({ error: formatSupabaseError(error) }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('[v0] Settings PUT error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
  }
}
