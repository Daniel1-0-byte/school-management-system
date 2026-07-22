import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabaseClient } from '@/lib/supabase';
import { verifySession } from '@/lib/platform-admin-auth.edge';

/**
 * POST /api/platform-admin/curriculum/activate
 * Activate a curriculum (only platform admins)
 * Deactivates all others and activates the specified one
 */
export async function POST(request: NextRequest) {
  try {
    // Verify platform admin authentication
    const headersList = await headers();
    const token = headersList.get('x-platform-admin-token');

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const session = await verifySession(token);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { curriculumId } = body;

    if (!curriculumId) {
      return NextResponse.json(
        { error: 'curriculumId is required' },
        { status: 400 }
      );
    }

    const supabase = getServerSupabaseClient();

    // Verify curriculum exists
    const { data: curriculum, error: checkError } = await supabase
      .from('system_curriculums')
      .select('id')
      .eq('id', curriculumId)
      .single();

    if (checkError || !curriculum) {
      return NextResponse.json(
        { error: 'Curriculum not found' },
        { status: 404 }
      );
    }

    // Deactivate all curriculums
    const { error: deactivateError } = await supabase
      .from('system_curriculums')
      .update({ is_active: false })
      .neq('id', curriculumId);

    if (deactivateError) {
      console.error('[v0] Error deactivating curriculums:', deactivateError);
      return NextResponse.json(
        { error: 'Failed to deactivate curriculums' },
        { status: 500 }
      );
    }

    // Activate the specified curriculum
    const { data: updated, error: activateError } = await supabase
      .from('system_curriculums')
      .update({ is_active: true })
      .eq('id', curriculumId)
      .select('id, name, version, is_active')
      .single();

    if (activateError) {
      console.error('[v0] Error activating curriculum:', activateError);
      return NextResponse.json(
        { error: 'Failed to activate curriculum' },
        { status: 500 }
      );
    }

    console.log(`[v0] Platform admin activated curriculum ${curriculumId}`);

    return NextResponse.json({
      success: true,
      data: {
        id: updated.id,
        name: updated.name,
        version: updated.version,
        isActive: updated.is_active,
      },
    });
  } catch (error) {
    console.error('[v0] Error in POST /api/platform-admin/curriculum/activate:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
