import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabaseClient } from '@/lib/supabase';

/**
 * GET /api/curriculum/class-subjects?class_id=UUID
 * Get subjects mapped to a specific class
 */
export async function GET(request: NextRequest) {
  try {
    const classId = request.nextUrl.searchParams.get('class_id');

    if (!classId) {
      return NextResponse.json(
        { error: 'class_id parameter is required' },
        { status: 400 }
      );
    }

    const supabase = getServerSupabaseClient();

    const { data, error } = await supabase
      .from('system_class_subjects')
      .select(
        `id, display_order, is_core, 
         system_subjects(id, code, name, short_name, description)`
      )
      .eq('class_id', classId)
      .order('display_order');

    if (error) {
      console.error('[v0] Error fetching class subjects:', error);
      return NextResponse.json(
        { error: 'Failed to fetch class subjects' },
        { status: 500 }
      );
    }

    const formattedData = data.map(cs => {
      const subject = cs.system_subjects as any;
      return {
        id: cs.id,
        displayOrder: cs.display_order,
        isCore: cs.is_core,
        subject: {
          id: subject.id,
          code: subject.code,
          name: subject.name,
          shortName: subject.short_name,
          description: subject.description,
        },
      };
    });

    return NextResponse.json({
      success: true,
      data: formattedData,
    });
  } catch (error) {
    console.error('[v0] Error in GET /api/curriculum/class-subjects:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
