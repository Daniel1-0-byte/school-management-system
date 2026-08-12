import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSupabaseClient } from '@/lib/supabase';
import { getSchoolIdFromRequest, requireRole } from '@/lib/auth-utils';

const schema = z.object({
  teacher_id: z.string().uuid(),
  academic_year_id: z.string().uuid(),
  subjects: z.array(z.string()).default([]),
  is_primary: z.boolean().default(false),
  start_date: z.string().optional().nullable(),
  end_date: z.string().optional().nullable(),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const roleError = await requireRole(request, ['Admin']);
  if (roleError) return roleError;
  const { id: streamId } = await params;
  const schoolId = await getSchoolIdFromRequest(request);
  if (!schoolId) return NextResponse.json({ error: 'Invalid school ID' }, { status: 400 });
  const body = schema.parse(await request.json());
  const supabase = getServerSupabaseClient();
  const { data: stream } = await supabase.from('school_class_streams').select('school_class_id, academic_year_id').eq('id', streamId).eq('school_id', schoolId).single();
  if (!stream) return NextResponse.json({ error: 'Classroom not found' }, { status: 404 });
  if (stream.academic_year_id !== body.academic_year_id) return NextResponse.json({ error: 'Academic year mismatch' }, { status: 400 });
  if (body.is_primary) {
    await supabase.from('teacher_assignments').update({ is_primary: false }).eq('school_id', schoolId).eq('class_id', stream.school_class_id).eq('academic_year_id', body.academic_year_id);
  }
  const { data, error } = await supabase.from('teacher_assignments').insert({ school_id: schoolId, class_id: stream.school_class_id, teacher_id: body.teacher_id, academic_year_id: body.academic_year_id, subjects: body.subjects || [], is_primary: body.is_primary, start_date: body.start_date || null, end_date: body.end_date || null }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ assignment: data }, { status: 201 });
}
