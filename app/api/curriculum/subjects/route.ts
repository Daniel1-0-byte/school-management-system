import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabaseClient } from '@/lib/supabase';

/**
 * GET /api/curriculum/subjects
 * Get all system subjects
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = getServerSupabaseClient();

    const { data, error } = await supabase
      .from('system_subjects')
      .select('id, code, name, short_name, description, created_at')
      .order('name');

    if (error) {
      console.error('[v0] Error fetching subjects:', error);
      return NextResponse.json(
        { error: 'Failed to fetch subjects' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: data.map(s => ({
        id: s.id,
        code: s.code,
        name: s.name,
        shortName: s.short_name,
        description: s.description,
        createdAt: s.created_at,
      })),
    });
  } catch (error) {
    console.error('[v0] Error in GET /api/curriculum/subjects:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
