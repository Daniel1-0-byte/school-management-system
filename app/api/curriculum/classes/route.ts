import { NextRequest, NextResponse } from 'next/server';
import { CurriculumService } from '@/lib/services/curriculum-service';
import { getServerSupabaseClient } from '@/lib/supabase';

/**
 * GET /api/curriculum/classes?curriculum_id=UUID
 * Get classes for a curriculum or active curriculum if not specified
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = getServerSupabaseClient();
    const curriculumId = request.nextUrl.searchParams.get('curriculum_id');

    let query = supabase
      .from('system_classes')
      .select('id, curriculum_id, code, name, display_order, created_at');

    if (curriculumId) {
      query = query.eq('curriculum_id', curriculumId);
    } else {
      // Get active curriculum's classes
      const activeCurriculum = await CurriculumService.getActiveCurriculum(supabase);
      if (!activeCurriculum) {
        return NextResponse.json(
          { success: true, data: [] },
          { status: 200 }
        );
      }
      query = query.eq('curriculum_id', activeCurriculum.id);
    }

    const { data, error } = await query.order('display_order');

    if (error) {
      console.error('[v0] Error fetching classes:', error);
      return NextResponse.json(
        { error: 'Failed to fetch classes' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: data.map(c => ({
        id: c.id,
        curriculumId: c.curriculum_id,
        code: c.code,
        name: c.name,
        displayOrder: c.display_order,
        createdAt: c.created_at,
      })),
    });
  } catch (error) {
    console.error('[v0] Error in GET /api/curriculum/classes:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
