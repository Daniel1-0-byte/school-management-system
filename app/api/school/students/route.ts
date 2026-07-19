import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from '@/lib/env';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const studentSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  dateOfBirth: z.string().optional(),
  gender: z.enum(['Male', 'Female', 'Other']).optional(),
  classId: z.string().min(1),
  rollNumber: z.string().optional(),
  status: z.enum(['active', 'graduated', 'withdrawn']).default('active'),
});

export async function GET(request: NextRequest) {
  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const page = parseInt(request.nextUrl.searchParams.get('page') || '1');
    const pageSize = parseInt(request.nextUrl.searchParams.get('pageSize') || '10');
    const search = request.nextUrl.searchParams.get('search') || '';
    const classId = request.nextUrl.searchParams.get('classId') || '';
    const status = request.nextUrl.searchParams.get('status') || 'active';

    let query = supabase
      .from('students')
      .select('*', { count: 'exact' });

    if (search) {
      query = query.or(`firstName.ilike.%${search}%,lastName.ilike.%${search}%,email.ilike.%${search}%`);
    }

    if (classId) {
      query = query.eq('class_id', classId);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data, count, error } = await query
      .order('createdAt', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (error) throw error;

    return NextResponse.json({
      data: data || [],
      total: count || 0,
      page,
      pageSize,
    });
  } catch (error) {
    console.error('[v0] Students GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch students' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const body = await request.json();
    const validatedData = studentSchema.parse(body);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Check if school_id is provided
    const schoolId = request.nextUrl.searchParams.get('school_id');
    if (!schoolId) {
      return NextResponse.json({ error: 'School ID required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('students')
      .insert({
        ...validatedData,
        school_id: schoolId,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('[v0] Students POST error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      { error: 'Failed to create student' },
      { status: 500 }
    );
  }
}
