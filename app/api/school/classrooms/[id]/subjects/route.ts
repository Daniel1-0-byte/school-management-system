import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSupabaseClient } from '@/lib/supabase';
import { getSchoolIdFromRequest, requireRole } from '@/lib/auth-utils';

const subjectSchema = z.object({
  subject_id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(255).optional(),
  code: z.string().trim().max(50).optional().nullable(),
}).refine((value) => Boolean(value.subject_id || value.name), {
  message: 'Provide an existing subject_id or a new subject name',
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const roleError = await requireRole(request, ['Admin']);
  if (roleError) return roleError;

  const { id: streamId } = await params;
  const schoolId = await getSchoolIdFromRequest(request);
  if (!schoolId) return NextResponse.json({ error: 'Invalid school ID' }, { status: 400 });

  const body = subjectSchema.parse(await request.json());
  const supabase = getServerSupabaseClient();
  const { data: stream } = await supabase
    .from('school_class_streams')
    .select('school_class_id')
    .eq('id', streamId)
    .eq('school_id', schoolId)
    .single();
  if (!stream) return NextResponse.json({ error: 'Classroom not found' }, { status: 404 });

  let subjectId = body.subject_id;
  if (body.name) {
    const normalizedName = body.name.replace(/\s+/g, ' ').trim().toLocaleLowerCase();
    const { data: existingSubjects, error: existingSubjectError } = await supabase
      .from('subjects')
      .select('id, name')
      .eq('school_id', schoolId);
    if (existingSubjectError) return NextResponse.json({ error: existingSubjectError.message }, { status: 400 });
    const duplicate = (existingSubjects || []).find((subject) => subject.name.replace(/\s+/g, ' ').trim().toLocaleLowerCase() === normalizedName);
    if (duplicate) return NextResponse.json({ error: `A subject named '${body.name}' already exists — select it from the list above instead` }, { status: 409 });

    const { data: subject, error } = await supabase
      .from('subjects')
      .insert({ school_id: schoolId, name: body.name, code: body.code || null })
      .select('id, name, code')
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    subjectId = subject.id;
  } else {
    const { data: subject } = await supabase
      .from('subjects')
      .select('id')
      .eq('id', subjectId)
      .eq('school_id', schoolId)
      .maybeSingle();
    if (!subject) return NextResponse.json({ error: 'Subject not found for this school' }, { status: 404 });
  }

  const { data: existing } = await supabase
    .from('class_subjects')
    .select('id')
    .eq('school_id', schoolId)
    .eq('class_id', stream.school_class_id)
    .eq('subject_id', subjectId)
    .maybeSingle();
  if (existing) return NextResponse.json({ error: 'This subject is already assigned to the class' }, { status: 409 });

  const { data: link, error } = await supabase
    .from('class_subjects')
    .insert({ school_id: schoolId, class_id: stream.school_class_id, subject_id: subjectId })
    .select('id, subject_id, created_at')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ classSubject: link }, { status: 201 });
}
