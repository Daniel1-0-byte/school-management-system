import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { CurriculumService } from '@/lib/services/curriculum-service';
import { getServerSupabaseClient } from '@/lib/supabase';
import { verifySession } from '@/lib/platform-admin-auth.edge';

/**
 * POST /api/platform-admin/curriculum-init
 * Initialize the platform curriculum (Ghana Basic School Curriculum)
 * Only platform admins can call this
 * Safe to call multiple times (checks if already exists)
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

    const supabase = getServerSupabaseClient();

    console.log('[v0] Starting curriculum initialization');

    // Seed Ghana curriculum
    const success = await CurriculumService.seedGhanaCurriculum(supabase);

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to seed curriculum' },
        { status: 500 }
      );
    }

    // Get the seeded curriculum
    const curriculum = await CurriculumService.getActiveCurriculum(supabase);

    console.log('[v0] Curriculum initialization completed successfully');

    return NextResponse.json({
      success: true,
      message: 'Ghana Basic School curriculum has been initialized',
      curriculum,
    });
  } catch (error) {
    console.error('[v0] Error in POST /api/platform-admin/curriculum-init:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/platform-admin/curriculum-init
 * Check if curriculum has been initialized
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = getServerSupabaseClient();

    const curriculum = await CurriculumService.getActiveCurriculum(supabase);

    return NextResponse.json({
      success: true,
      initialized: curriculum !== null,
      curriculum,
    });
  } catch (error) {
    console.error('[v0] Error in GET /api/platform-admin/curriculum-init:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
