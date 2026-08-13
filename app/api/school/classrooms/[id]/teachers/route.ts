import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabaseClient, queryProfiles, queryTeacherAssignments } from '@/lib/supabase';
import { getSchoolIdFromRequest, requireRole } from '@/lib/auth-utils';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const roleError = await requireRole(request, ['Admin']);
  if (roleError) return roleError;
  const { id } = await params;
  const schoolId = await getSchoolIdFromRequest(request);
  if (!schoolId) return NextResponse.json({ error: 'Invalid school ID' }, { status: 400 });
  const supabase = getServerSupabaseClient();
  const { data: stream, error: streamError } = await supabase.from('school_class_streams').select('id, name, school_class_id, academic_year_id, school_classes(name, level)').eq('id', id).eq('school_id', schoolId).single();
  if (streamError || !stream) return NextResponse.json({ error: 'Classroom not found' }, { status: 404 });
  const [{ data: assignments, error: assignmentError }, { data: teachers, error: teacherError }] = await Promise.all([
    queryTeacherAssignments().select('id, teacher_id, academic_year_id, subjects, is_primary_teacher, start_date, end_date').eq('school_id', schoolId).eq('class_id', stream.school_class_id).eq('academic_year_id', stream.academic_year_id).is('end_date', null).order('is_primary_teacher', { ascending: false }).order('created_at', { ascending: true }),
    queryProfiles().select('id, first_name, last_name').eq('school_id', schoolId).eq('system_role', 'Teacher').eq('status', 'active').order('last_name').order('first_name'),
  ]);
  if (assignmentError || teacherError) {
    console.error('[v0] Classroom teachers load error:', {
      assignmentError,
      teacherError,
    });
    return NextResponse.json({ error: 'Failed to load classroom teachers' }, { status: 500 });
  }
  return NextResponse.json({ stream, assignments: assignments || [], teachers: teachers || [] });
}
