import { NextRequest, NextResponse } from 'next/server';
import { queryAssessments, formatSupabaseError, getServerSupabaseClient } from '@/lib/supabase';
import { getSchoolIdFromRequest, validateSchoolIdAccess } from '@/lib/auth-utils';
import { validateAssessmentStatusUpdate } from '@/lib/schemas';

/**
 * GET /api/school/assessments/[id]
 * Fetch a specific assessment
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    if (!id || id === 'undefined' || id === 'null' || id.length === 0) {
      return NextResponse.json({ error: 'Invalid assessment ID' }, { status: 400 });
    }

    const schoolId = await getSchoolIdFromRequest(request);

    if (typeof schoolId !== 'string') {
      return NextResponse.json({ error: 'Invalid school ID' }, { status: 400 });
    }

    const validation = await validateSchoolIdAccess(schoolId);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error || 'Invalid school access' }, { status: 403 });
    }

    const { data, error } = await queryAssessments()
      .select('*')
      .eq('id', id)
      .eq('school_id', schoolId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
      }
      console.error('[v0] Assessment GET error:', error);
      return NextResponse.json({ error: formatSupabaseError(error) }, { status: 400 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('[v0] Assessment GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch assessment' }, { status: 500 });
  }
}

/**
 * PATCH /api/school/assessments/[id]
 * Update assessment status (submission, approval workflow)
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    if (!id || id === 'undefined' || id === 'null' || id.length === 0) {
      return NextResponse.json({ error: 'Invalid assessment ID' }, { status: 400 });
    }

    const schoolId = await getSchoolIdFromRequest(request);

    if (typeof schoolId !== 'string') {
      return NextResponse.json({ error: 'Invalid school ID' }, { status: 400 });
    }

    const validation = await validateSchoolIdAccess(schoolId);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error || 'Invalid school access' }, { status: 403 });
    }

    // Verify assessment belongs to school
    const { data: assessment, error: selectError } = await queryAssessments()
      .select('school_id, status')
      .eq('id', id)
      .eq('school_id', schoolId)
      .single();

    if (selectError || !assessment) {
      return NextResponse.json({ error: 'Assessment not found or unauthorized' }, { status: 404 });
    }

    const body = await request.json();
    const validatedData = validateAssessmentStatusUpdate(body);

    if (!validatedData) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const updatePayload: any = {
      status: validatedData.status,
      last_modified: new Date().toISOString(),
    };

    // If submitting, set submitted_by and submitted_at
    if (validatedData.status === 'submitted') {
      const userId = request.headers.get('x-user-id');
      updatePayload.submitted_by = userId;
      updatePayload.submitted_at = new Date().toISOString();
    }

    // If approved, set approved_by and approved_at
    if (validatedData.status === 'approved') {
      const userId = request.headers.get('x-user-id');
      updatePayload.approved_by = userId;
      updatePayload.approved_at = new Date().toISOString();
    }

    // If returned, set returned_at and approval_notes
    if (validatedData.status === 'returned') {
      updatePayload.returned_at = new Date().toISOString();
      if (validatedData.approval_notes) {
        updatePayload.approval_notes = validatedData.approval_notes;
      }
    }

    const { data: updatedAssessment, error: updateError } = await getServerSupabaseClient()
      .from('assessments')
      .update(updatePayload)
      .eq('id', id)
      .eq('school_id', schoolId)
      .select('*')
      .single();

    if (updateError) {
      console.error('[v0] Assessment PATCH error:', updateError);
      return NextResponse.json({ error: formatSupabaseError(updateError) }, { status: 400 });
    }

    return NextResponse.json({ data: updatedAssessment });
  } catch (error) {
    console.error('[v0] Assessment PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update assessment' }, { status: 500 });
  }
}

/**
 * DELETE /api/school/assessments/[id]
 * Delete an assessment (only if status is 'not_started')
 */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    if (!id || id === 'undefined' || id === 'null' || id.length === 0) {
      return NextResponse.json({ error: 'Invalid assessment ID' }, { status: 400 });
    }

    const schoolId = await getSchoolIdFromRequest(request);

    if (typeof schoolId !== 'string') {
      return NextResponse.json({ error: 'Invalid school ID' }, { status: 400 });
    }

    const validation = await validateSchoolIdAccess(schoolId);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error || 'Invalid school access' }, { status: 403 });
    }

    // Verify assessment belongs to school and is in 'not_started' status
    const { data: assessment, error: selectError } = await queryAssessments()
      .select('school_id, status')
      .eq('id', id)
      .eq('school_id', schoolId)
      .single();

    if (selectError || !assessment) {
      return NextResponse.json({ error: 'Assessment not found or unauthorized' }, { status: 404 });
    }

    if (assessment.status !== 'not_started') {
      return NextResponse.json(
        { error: 'Cannot delete assessment that has already started or been submitted' },
        { status: 400 }
      );
    }

    const { error: deleteError } = await getServerSupabaseClient()
      .from('assessments')
      .delete()
      .eq('id', id)
      .eq('school_id', schoolId);

    if (deleteError) {
      console.error('[v0] Assessment DELETE error:', deleteError);
      return NextResponse.json({ error: formatSupabaseError(deleteError) }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[v0] Assessment DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete assessment' }, { status: 500 });
  }
}
