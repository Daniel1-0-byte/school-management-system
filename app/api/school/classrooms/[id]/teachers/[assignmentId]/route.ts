import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabaseClient } from '@/lib/supabase';
import { getSchoolIdFromRequest, requireRole } from '@/lib/auth-utils';

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string; assignmentId: string }> }) {
  const roleError = await requireRole(request, ['Admin']);
  if (roleError) return roleError;
  const { id: streamId, assignmentId } = await params;
  const schoolId = await getSchoolIdFromRequest(request);
  if (!schoolId) return NextResponse.json({ error: 'Invalid school ID' }, { status: 400 });
  const supabase = getServerSupabaseClient();
  const { data: stream } = await supabase.from('school_class_streams').select('school_class_id, academic_year_id').eq('id', streamId).eq('school_id', schoolId).single();
  if (!stream) return NextResponse.json({ error: 'Classroom not found' }, { status: 404 });
  const { data: endedAssignment, error } = await supabase
    .from('teacher_assignments')
    .update({ end_date: new Date().toISOString().slice(0, 10) })
    .eq('id', assignmentId)
    .eq('school_id', schoolId)
    .eq('class_id', stream.school_class_id)
    .eq('academic_year_id', stream.academic_year_id)
    .is('end_date', null)
    .select('id');
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!endedAssignment || endedAssignment.length === 0) {
    return NextResponse.json({ error: 'Teacher assignment not found or already removed' }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
