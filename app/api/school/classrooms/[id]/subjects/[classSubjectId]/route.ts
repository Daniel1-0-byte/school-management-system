import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabaseClient } from '@/lib/supabase';
import { getSchoolIdFromRequest, requireRole } from '@/lib/auth-utils';

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string; classSubjectId: string }> }) {
  const roleError = await requireRole(request, ['Admin']);
  if (roleError) return roleError;

  const { id: streamId, classSubjectId } = await params;
  const schoolId = await getSchoolIdFromRequest(request);
  if (!schoolId) return NextResponse.json({ error: 'Invalid school ID' }, { status: 400 });

  const supabase = getServerSupabaseClient();
  const { data: stream } = await supabase
    .from('school_class_streams')
    .select('school_class_id')
    .eq('id', streamId)
    .eq('school_id', schoolId)
    .single();
  if (!stream) return NextResponse.json({ error: 'Classroom not found' }, { status: 404 });

  const { data, error } = await supabase
    .from('class_subjects')
    .delete()
    .eq('id', classSubjectId)
    .eq('school_id', schoolId)
    .eq('class_id', stream.school_class_id)
    .select('id');
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!data?.length) return NextResponse.json({ error: 'Subject assignment not found' }, { status: 404 });
  return NextResponse.json({ success: true });
}
