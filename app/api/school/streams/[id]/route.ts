import { NextRequest, NextResponse } from 'next/server';
import { querySchoolClassStreams, formatSupabaseError, getServerSupabaseClient } from '@/lib/supabase';
import { getSchoolIdFromRequest, validateSchoolIdAccess } from '@/lib/auth-utils';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    
    // Validate stream ID is not undefined, null, or the string "undefined"
    if (!id || id === 'undefined' || id === 'null' || (typeof id === 'string' && id.length === 0)) {
      console.log('[v0] GET validation failed for stream ID:', id);
      return NextResponse.json({ error: 'Invalid stream ID' }, { status: 400 });
    }

    const schoolId = await getSchoolIdFromRequest(request);

    if (typeof schoolId !== 'string') {
      return NextResponse.json({ error: 'Invalid school ID' }, { status: 400 });
    }

    const validation = await validateSchoolIdAccess(schoolId);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error || 'Invalid school access' }, { status: 403 });
    }

    const { data: stream, error: streamError } = await querySchoolClassStreams()
      .select('id, school_id, school_class_id, name, capacity, status, class_teacher_id, created_at, updated_at')
      .eq('id', id)
      .eq('school_id', schoolId)
      .single();

    if (streamError) {
      if (streamError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Stream not found' }, { status: 404 });
      }
      console.error('[v0] Stream GET error:', streamError);
      return NextResponse.json({ error: formatSupabaseError(streamError) }, { status: 400 });
    }

    // Fetch school_classes data separately
    let schoolClass = null;
    if (stream?.school_class_id) {
      const { data: classData } = await getServerSupabaseClient()
        .from('school_classes')
        .select('id, name, level')
        .eq('id', stream.school_class_id)
        .eq('school_id', schoolId)
        .single();
      schoolClass = classData;
    }

    const mergedStream = {
      ...stream,
      school_classes: schoolClass,
    };

    return NextResponse.json({ data: mergedStream });
  } catch (error) {
    console.error('[v0] Stream GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch stream' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    
    // Validate stream ID is not undefined, null, or the string "undefined"
    if (!id || id === 'undefined' || id === 'null' || (typeof id === 'string' && id.length === 0)) {
      console.log('[v0] PATCH validation failed for stream ID:', id);
      return NextResponse.json({ error: 'Invalid stream ID' }, { status: 400 });
    }

    const schoolId = await getSchoolIdFromRequest(request);

    if (typeof schoolId !== 'string') {
      return NextResponse.json({ error: 'Invalid school ID' }, { status: 400 });
    }

    const validation = await validateSchoolIdAccess(schoolId);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error || 'Invalid school access' }, { status: 403 });
    }

    // Verify stream belongs to school before updating
    const { data: streamData, error: selectError } = await querySchoolClassStreams()
      .select('school_id')
      .eq('id', id)
      .eq('school_id', schoolId)
      .single();

    if (selectError || !streamData) {
      return NextResponse.json({ error: 'Stream not found or unauthorized' }, { status: 404 });
    }

    const body = await request.json();
    const { name, school_class_id, capacity, class_teacher_id, status } = body;

    const updatePayload = {
      ...(name !== undefined && { name }),
      ...(school_class_id !== undefined && { school_class_id }),
      ...(capacity !== undefined && { capacity }),
      ...(class_teacher_id !== undefined && { class_teacher_id }),
      ...(status !== undefined && { status }),
    };

    // Update stream with provided fields
    const { error: updateError, data: updatedStream } = await querySchoolClassStreams()
      .update(updatePayload)
      .eq('id', id)
      .eq('school_id', schoolId)
      .select('id, school_id, school_class_id, name, capacity, status, class_teacher_id, created_at, updated_at')
      .single();

    if (updateError) {
      console.error('[v0] Stream PATCH error:', updateError);
      return NextResponse.json({ error: formatSupabaseError(updateError) }, { status: 400 });
    }

    // Fetch school_classes data separately
    let schoolClass = null;
    if (updatedStream?.school_class_id) {
      const { data: classData } = await getServerSupabaseClient()
        .from('school_classes')
        .select('id, name, level')
        .eq('id', updatedStream.school_class_id)
        .eq('school_id', schoolId)
        .single();
      schoolClass = classData;
    }

    const mergedStream = {
      ...updatedStream,
      school_classes: schoolClass,
    };

    return NextResponse.json({ data: mergedStream });
  } catch (error) {
    console.error('[v0] Stream PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update stream' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    
    // Validate stream ID is not undefined, null, or the string "undefined"
    if (!id || id === 'undefined' || id === 'null' || (typeof id === 'string' && id.length === 0)) {
      console.log('[v0] DELETE validation failed for stream ID:', id);
      return NextResponse.json({ error: 'Invalid stream ID' }, { status: 400 });
    }

    const schoolId = await getSchoolIdFromRequest(request);

    if (typeof schoolId !== 'string') {
      return NextResponse.json({ error: 'Invalid school ID' }, { status: 400 });
    }

    const validation = await validateSchoolIdAccess(schoolId);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error || 'Invalid school access' }, { status: 403 });
    }

    // Verify stream belongs to school before deleting
    const { data: streamData, error: selectError } = await querySchoolClassStreams()
      .select('school_id')
      .eq('id', id)
      .eq('school_id', schoolId)
      .single();

    if (selectError || !streamData) {
      return NextResponse.json({ error: 'Stream not found or unauthorized' }, { status: 404 });
    }

    // Update status to inactive
    const { error: updateError } = await querySchoolClassStreams()
      .update({ status: 'inactive' })
      .eq('id', id);

    if (updateError) {
      console.error('[v0] Stream DELETE error:', updateError);
      return NextResponse.json({ error: formatSupabaseError(updateError) }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[v0] Stream DELETE error:', error);
    return NextResponse.json({ error: 'Failed to deactivate stream' }, { status: 500 });
  }
}
