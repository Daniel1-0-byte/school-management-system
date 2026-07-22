import { NextRequest, NextResponse } from 'next/server';
import { CurriculumService } from '@/lib/services/curriculum-service';
import { getServerSupabaseClient } from '@/lib/supabase';

/**
 * GET /api/curriculum/curriculums
 * Get all curriculums (platform admin only can see all; others see only active)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = getServerSupabaseClient();

    const { data, error } = await supabase
      .from('system_curriculums')
      .select('id, name, version, description, is_active, created_at, updated_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[v0] Error fetching curriculums:', error);
      return NextResponse.json(
        { error: 'Failed to fetch curriculums' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: data.map(c => ({
        id: c.id,
        name: c.name,
        version: c.version,
        description: c.description,
        isActive: c.is_active,
        createdAt: c.created_at,
        updatedAt: c.updated_at,
      })),
    });
  } catch (error) {
    console.error('[v0] Error in GET /api/curriculum/curriculums:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
