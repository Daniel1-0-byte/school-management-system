import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { queryProfiles, formatSupabaseError, getServerSupabaseClient } from '@/lib/supabase';
import { getSchoolIdFromRequest, validateSchoolIdAccess, getUserIdFromRequest } from '@/lib/auth-utils';

const signatureSchema = z.object({
  signature_url: z.string().url().nullable(),
});

/**
 * PUT /api/school/settings/signature
 * Update headteacher signature URL for the current user
 * Only admins can update their own signature
 */
export async function PUT(request: NextRequest) {
  try {
    const schoolId = await getSchoolIdFromRequest(request);
    const userId = getUserIdFromRequest(request);

    if (typeof schoolId !== 'string') {
      return NextResponse.json({ error: 'Invalid school ID' }, { status: 400 });
    }

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const validation = await validateSchoolIdAccess(schoolId);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error || 'Invalid school access' }, { status: 403 });
    }

    const body = await request.json();
    const { signature_url } = signatureSchema.parse(body);

    const supabase = getServerSupabaseClient();

    // Verify user is an admin in this school
    const { data: profile, error: profileError } = await queryProfiles()
      .select('system_role')
      .eq('id', userId)
      .eq('school_id', schoolId)
      .single();

    if (profileError || !profile || profile.system_role !== 'Admin') {
      return NextResponse.json(
        { error: 'Only admins can update school signature' },
        { status: 403 }
      );
    }

    // Update signature URL
    const { data, error } = await queryProfiles()
      .update({ signature_url })
      .eq('id', userId)
      .eq('school_id', schoolId)
      .select()
      .single();

    if (error) {
      console.error('[v0] Signature update error:', error);
      return NextResponse.json({ error: formatSupabaseError(error) }, { status: 400 });
    }

    return NextResponse.json({
      message: 'Signature updated successfully',
      signature_url: data.signature_url,
    });
  } catch (error) {
    console.error('[v0] Signature PUT error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to update signature' }, { status: 500 });
  }
}

/**
 * DELETE /api/school/settings/signature
 * Remove headteacher signature for the current user
 */
export async function DELETE(request: NextRequest) {
  try {
    const schoolId = await getSchoolIdFromRequest(request);
    const userId = getUserIdFromRequest(request);

    if (typeof schoolId !== 'string') {
      return NextResponse.json({ error: 'Invalid school ID' }, { status: 400 });
    }

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const validation = await validateSchoolIdAccess(schoolId);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error || 'Invalid school access' }, { status: 403 });
    }

    // Verify user is an admin
    const { data: profile, error: profileError } = await queryProfiles()
      .select('system_role')
      .eq('id', userId)
      .eq('school_id', schoolId)
      .single();

    if (profileError || !profile || profile.system_role !== 'Admin') {
      return NextResponse.json(
        { error: 'Only admins can delete school signature' },
        { status: 403 }
      );
    }

    // Delete signature
    const { data, error } = await queryProfiles()
      .update({ signature_url: null })
      .eq('id', userId)
      .eq('school_id', schoolId)
      .select()
      .single();

    if (error) {
      console.error('[v0] Signature delete error:', error);
      return NextResponse.json({ error: formatSupabaseError(error) }, { status: 400 });
    }

    return NextResponse.json({ message: 'Signature deleted successfully' });
  } catch (error) {
    console.error('[v0] Signature DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete signature' }, { status: 500 });
  }
}
