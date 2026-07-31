import { NextRequest, NextResponse } from 'next/server';
import { formatSupabaseError, queryTerms, getServerSupabaseClient } from '@/lib/supabase';
import { getSchoolIdFromRequest, validateSchoolIdAccess } from '@/lib/auth-utils';

/**
 * PATCH /api/school/terms/[id]
 * Update a term
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const schoolId = await getSchoolIdFromRequest(request);

    if (typeof schoolId !== 'string') {
      return NextResponse.json({ error: 'Invalid school ID' }, { status: 400 });
    }

    const validation = await validateSchoolIdAccess(schoolId);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error || 'Invalid school access' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { type, start_date, end_date, report_card_deadline } = body;

    // Validation
    if (start_date && end_date && new Date(end_date) <= new Date(start_date)) {
      return NextResponse.json({ error: 'Term end date must be after start date' }, { status: 400 });
    }

    if (report_card_deadline && end_date && new Date(report_card_deadline) <= new Date(end_date)) {
      return NextResponse.json({ error: 'Report card deadline must be after term end date' }, { status: 400 });
    }

    const client = getServerSupabaseClient();

    // Get current term to verify it belongs to this school
    const { data: currentTerm, error: fetchError } = await queryTerms()
      .select('id, academic_year_id')
      .eq('id', id)
      .single();

    if (fetchError || !currentTerm) {
      return NextResponse.json({ error: 'Term not found' }, { status: 404 });
    }

    // Verify academic year belongs to this school
    const { data: academicYear, error: yearError } = await client
      .from('academic_years')
      .select('start_date, end_date')
      .eq('id', currentTerm.academic_year_id)
      .eq('school_id', schoolId)
      .single();

    if (yearError || !academicYear) {
      return NextResponse.json({ error: 'Invalid academic year' }, { status: 404 });
    }

    // Validate dates if updating
    if (start_date && new Date(start_date) < new Date(academicYear.start_date)) {
      return NextResponse.json({ error: 'Term start date must be after academic year start' }, { status: 400 });
    }

    if (end_date && new Date(end_date) > new Date(academicYear.end_date)) {
      return NextResponse.json({ error: 'Term end date must be before academic year end' }, { status: 400 });
    }

    // Update term
    const { data, error } = await client
      .from('terms')
      .update({
        ...(type && { type }),
        ...(start_date && { start_date }),
        ...(end_date && { end_date }),
        ...(report_card_deadline !== undefined && { report_card_deadline }),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[v0] Term PATCH error:', error);
      return NextResponse.json({ error: formatSupabaseError(error) }, { status: 400 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('[v0] Term PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update term' }, { status: 500 });
  }
}

/**
 * DELETE /api/school/terms/[id]
 * Delete a term
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const schoolId = await getSchoolIdFromRequest(request);

    if (typeof schoolId !== 'string') {
      return NextResponse.json({ error: 'Invalid school ID' }, { status: 400 });
    }

    const validation = await validateSchoolIdAccess(schoolId);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error || 'Invalid school access' }, { status: 403 });
    }

    const { id } = await params;
    const client = getServerSupabaseClient();

    // Get term to verify it belongs to this school's academic year
    const { data: term, error: fetchError } = await queryTerms()
      .select('id, academic_year_id')
      .eq('id', id)
      .single();

    if (fetchError || !term) {
      return NextResponse.json({ error: 'Term not found' }, { status: 404 });
    }

    // Verify academic year belongs to this school
    const { data: academicYear, error: yearError } = await client
      .from('academic_years')
      .select('id')
      .eq('id', term.academic_year_id)
      .eq('school_id', schoolId)
      .single();

    if (yearError || !academicYear) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Check for dependent data (grade entries, etc.)
    const { count: gradeCount } = await client
      .from('grade_entries')
      .select('*', { count: 'exact', head: true })
      .eq('term_id', id);

    if (gradeCount && gradeCount > 0) {
      return NextResponse.json(
        { error: 'Cannot delete term with existing grade entries' },
        { status: 400 }
      );
    }

    // Delete term
    const { error } = await client
      .from('terms')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[v0] Term DELETE error:', error);
      return NextResponse.json({ error: formatSupabaseError(error) }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[v0] Term DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete term' }, { status: 500 });
  }
}
