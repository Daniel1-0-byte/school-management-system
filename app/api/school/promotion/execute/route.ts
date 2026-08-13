import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabaseClient } from '@/lib/supabase';
import { getSchoolIdFromRequest, requireRole } from '@/lib/auth-utils';

type PromotionOutcome = {
  enrollment_id: string;
  outcome: 'PROMOTE' | 'HOLD_BACK' | 'GRADUATE';
  target_class_id?: string | null;
  target_stream_id?: string | null;
};

export async function POST(request: NextRequest) {
  const roleError = await requireRole(request, ['Admin']);
  if (roleError) return roleError;

  try {
    const body = await request.json();
    const schoolId = await getSchoolIdFromRequest(request);
    const { source_year_id, target_year_id, outcomes } = body as {
      source_year_id?: unknown;
      target_year_id?: unknown;
      outcomes?: unknown;
    };

    if (!schoolId || typeof source_year_id !== 'string' || typeof target_year_id !== 'string') {
      return NextResponse.json({ error: 'School, source year, and target year are required' }, { status: 400 });
    }

    if (!Array.isArray(outcomes) || outcomes.length === 0) {
      return NextResponse.json({ error: 'At least one promotion outcome is required' }, { status: 400 });
    }

    const validOutcomes = outcomes.every((item): item is PromotionOutcome => {
      if (!item || typeof item !== 'object') return false;
      const candidate = item as Record<string, unknown>;
      return typeof candidate.enrollment_id === 'string'
        && ['PROMOTE', 'HOLD_BACK', 'GRADUATE'].includes(String(candidate.outcome));
    });

    if (!validOutcomes) {
      return NextResponse.json({ error: 'Invalid promotion outcome payload' }, { status: 400 });
    }

    // Hard requirement: SECURITY INVOKER RPC must use the service-role client.
    const supabase = getServerSupabaseClient();
    const { data, error } = await supabase.rpc('execute_student_promotion', {
      p_school_id: schoolId,
      p_source_year_id: source_year_id,
      p_target_year_id: target_year_id,
      p_outcomes: outcomes,
    });

    if (error) {
      console.error('[v0] Student promotion transaction failed:', error);
      return NextResponse.json({ error: error.message || 'Promotion transaction failed. Nothing was changed.' }, { status: 400 });
    }

    return NextResponse.json({ success: true, summary: data });
  } catch (error) {
    console.error('[v0] Student promotion execution error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Promotion transaction failed. Nothing was changed.' }, { status: 500 });
  }
}
