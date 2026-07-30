import { NextRequest, NextResponse } from 'next/server';
import { formatSupabaseError, getServerSupabaseClient } from '@/lib/supabase';
import { getSchoolIdFromRequest, validateSchoolIdAccess } from '@/lib/auth-utils';

/**
 * PATCH /api/school/academic-years/[id]
 * Update an academic year
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const { id } = params;
    const body = await request.json();
    const { year, start_date, end_date, is_active } = body;

    // Validation
    if (start_date && end_date && new Date(end_date) <= new Date(start_date)) {
      return NextResponse.json({ error: 'End date must be after start date' }, { status: 400 });
    }

    const client = getServerSupabaseClient();

    // If making active, deactivate all other years
    if (is_active) {
      await client
        .from('academic_years')
        .update({ is_active: false })
        .eq('school_id', schoolId);
    }

    // Update academic year
    const { data, error } = await client
      .from('academic_years')
      .update({
        ...(year && { year }),
        ...(start_date && { start_date }),
        ...(end_date && { end_date }),
        ...(is_active !== undefined && { is_active }),
      })
      .eq('id', id)
      .eq('school_id', schoolId)
      .select()
      .single();

    if (error) {
      console.error('[v0] Academic year PATCH error:', error);
      return NextResponse.json({ error: formatSupabaseError(error) }, { status: 400 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('[v0] Academic year PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update academic year' }, { status: 500 });
  }
}

/**
 * DELETE /api/school/academic-years/[id]
 * Delete an academic year (only if no dependent data exists)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const { id } = params;
    const client = getServerSupabaseClient();

    // Check for dependent data (assessments, etc.)
    const { count: assessmentCount } = await client
      .from('assessments')
      .select('*', { count: 'exact', head: true })
      .eq('academic_year_id', id);

    if (assessmentCount && assessmentCount > 0) {
      return NextResponse.json(
        { error: 'Cannot delete academic year with existing assessments' },
        { status: 400 }
      );
    }

    // Delete associated terms first
    await client.from('terms').delete().eq('academic_year_id', id);

    // Delete academic year
    const { error } = await client
      .from('academic_years')
      .delete()
      .eq('id', id)
      .eq('school_id', schoolId);

    if (error) {
      console.error('[v0] Academic year DELETE error:', error);
      return NextResponse.json({ error: formatSupabaseError(error) }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[v0] Academic year DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete academic year' }, { status: 500 });
  }
}
