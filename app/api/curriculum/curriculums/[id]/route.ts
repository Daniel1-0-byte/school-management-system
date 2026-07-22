import { NextRequest, NextResponse } from 'next/server';
import { CurriculumService } from '@/lib/services/curriculum-service';
import { getServerSupabaseClient } from '@/lib/supabase';

interface RouteParams {
  params: { id: string };
}

/**
 * GET /api/curriculum/curriculums/[id]
 * Get detailed curriculum with all classes and subjects
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { error: 'Curriculum ID is required' },
        { status: 400 }
      );
    }

    const supabase = getServerSupabaseClient();
    const curriculum = await CurriculumService.getCurriculumDetails(supabase, id);

    if (!curriculum) {
      return NextResponse.json(
        { error: 'Curriculum not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: curriculum,
    });
  } catch (error) {
    console.error('[v0] Error in GET /api/curriculum/curriculums/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
