import { NextRequest, NextResponse } from 'next/server';
import { formatSupabaseError, getServerSupabaseClient, queryStudentEnrollments } from '@/lib/supabase';
import { getAuthenticatedProfile, getSchoolIdFromRequest, validateSchoolIdAccess } from '@/lib/auth-utils';

export async function GET(request: NextRequest) {
  const schoolId = await getSchoolIdFromRequest(request);
  const sourceYearId = request.nextUrl.searchParams.get('source_year_id');
  const targetYearId = request.nextUrl.searchParams.get('target_year_id');
  const classId = request.nextUrl.searchParams.get('class_id');

  if (!schoolId || !sourceYearId || !targetYearId || !classId) {
    return NextResponse.json({ error: 'source_year_id, target_year_id, and class_id are required' }, { status: 400 });
  }
  if (sourceYearId === targetYearId) {
    return NextResponse.json({ error: 'Source and target academic years must be different' }, { status: 400 });
  }

  const access = await validateSchoolIdAccess(schoolId);
  if (!access.valid) return NextResponse.json({ error: access.error || 'Invalid school access' }, { status: 403 });
  const { profile, error: profileError } = await getAuthenticatedProfile(request);
  if (profileError || profile?.school_id !== schoolId || profile.system_role !== 'Admin') {
    return NextResponse.json({ error: 'Only school admins can preview promotions' }, { status: 403 });
  }

  const supabase = getServerSupabaseClient();
  const [{ data: sourceClass, error: sourceClassError }, { data: sourceYearClasses, error: sourceYearClassesError }, { data: targetClasses, error: targetClassesError }] = await Promise.all([
    supabase.from('school_classes').select('id, name, display_order, academic_year_id').eq('id', classId).eq('school_id', schoolId).eq('academic_year_id', sourceYearId).single(),
    supabase.from('school_classes').select('id, display_order').eq('school_id', schoolId).eq('academic_year_id', sourceYearId).order('display_order', { ascending: false }),
    supabase.from('school_classes').select('id, name, display_order, academic_year_id').eq('school_id', schoolId).eq('academic_year_id', targetYearId).order('display_order'),
  ]);
  if (sourceClassError || !sourceClass) return NextResponse.json({ error: 'Source class not found for the selected academic year' }, { status: 404 });
  if (sourceYearClassesError || targetClassesError) return NextResponse.json({ error: formatSupabaseError(sourceYearClassesError || targetClassesError) }, { status: 400 });

  const highestSourceDisplayOrder = (sourceYearClasses || []).reduce(
    (highest: number, item: any) => Math.max(highest, item.display_order ?? -Infinity),
    -Infinity,
  );
  const isFinalClass = sourceClass.display_order === highestSourceDisplayOrder;
  const destinationClass = (targetClasses || []).find((item: any) => item.display_order === sourceClass.display_order + 1) || null;
  const [{ data: enrollments, error: enrollmentError }, { data: targetStreams, error: streamError }] = await Promise.all([
    queryStudentEnrollments().select('id, student_id, stream_id, class_id, academic_year_id, status, students(id, first_name, last_name)').eq('school_id', schoolId).eq('academic_year_id', sourceYearId).eq('class_id', classId).eq('status', 'active'),
    destinationClass ? supabase.from('school_class_streams').select('id, name, school_class_id, academic_year_id, status').eq('school_id', schoolId).eq('academic_year_id', targetYearId).eq('school_class_id', destinationClass.id).eq('status', 'active').order('name') : Promise.resolve({ data: [], error: null } as any),
  ]);
  if (enrollmentError || streamError) return NextResponse.json({ error: formatSupabaseError(enrollmentError || streamError) }, { status: 400 });

  const sourceStreamIds = [...new Set((enrollments || []).map((item: any) => item.stream_id).filter(Boolean))];
  const sourceStreams = sourceStreamIds.length ? await supabase.from('school_class_streams').select('id, name').in('id', sourceStreamIds) : { data: [] } as any;
  const sourceStreamNames = new Map((sourceStreams.data || []).map((stream: any) => [stream.id, stream.name]));

  const students = (enrollments || []).map((enrollment: any) => {
    const student = Array.isArray(enrollment.students) ? enrollment.students[0] : enrollment.students;
    const name = [student?.first_name, student?.last_name].filter(Boolean).join(' ') || 'Unnamed student';
    const matchingStream = (targetStreams || []).find((stream: any) => stream.name === sourceStreamNames.get(enrollment.stream_id)) || (targetStreams || [])[0] || null;
    return { enrollment_id: enrollment.id, student_id: enrollment.student_id, name, source_stream_name: sourceStreamNames.get(enrollment.stream_id) || null, target_stream: matchingStream ? { id: matchingStream.id, name: matchingStream.name } : null, default_outcome: destinationClass ? 'promote' : 'graduate' };
  });

  const informationalMessages = isFinalClass
    ? ['This is the final class — students will graduate.']
    : [];
  const warnings = !destinationClass && !isFinalClass
    ? ['The next class is not configured in the target academic year. Promotion is disabled for this class.']
    : !isFinalClass && !targetStreams?.length
      ? ['The next class exists, but it has no active streams. Promotion is disabled until a stream is created.']
      : [];

  return NextResponse.json({ source: { id: sourceClass.id, name: sourceClass.name, display_order: sourceClass.display_order, is_final_class: isFinalClass }, target: destinationClass ? { id: destinationClass.id, name: destinationClass.name, display_order: destinationClass.display_order, streams: (targetStreams || []).map((stream: any) => ({ id: stream.id, name: stream.name })) } : null, informational_messages: informationalMessages, warnings, students });
}
