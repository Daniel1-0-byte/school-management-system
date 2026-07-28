import { NextRequest, NextResponse } from 'next/server';
import { querySchoolGradingPolicies, formatSupabaseError, getServerSupabaseClient } from '@/lib/supabase';
import { getSchoolIdFromRequest, validateSchoolIdAccess } from '@/lib/auth-utils';
import { validateGradingPolicy } from '@/lib/schemas';

/**
 * GET /api/school/grading-policies
 * Fetch grading policy for the authenticated user's school
 */
export async function GET(request: NextRequest) {
  try {
    const schoolId = await getSchoolIdFromRequest(request);

    if (typeof schoolId !== 'string') {
      return NextResponse.json({ error: 'Invalid school ID' }, { status: 400 });
    }

    const validation = await validateSchoolIdAccess(schoolId);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error || 'Invalid school access' }, { status: 403 });
    }

    const { data, error } = await querySchoolGradingPolicies()
      .select('*')
      .eq('school_id', schoolId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Return default grading policy instead of 404
        return NextResponse.json({ 
          data: {
            school_id: schoolId,
            class_score_weight: 30,
            exam_score_weight: 70,
            grade_scale: { A: 80, B: 70, C: 60, D: 50, F: 0 },
            remarks_scale: {
              excellent: 'Excellent performance',
              good: 'Good performance',
              fair: 'Fair performance',
              poor: 'Needs improvement',
            },
          }
        });
      }
      console.error('[v0] Grading policy GET error:', error);
      return NextResponse.json({ error: formatSupabaseError(error) }, { status: 400 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('[v0] Grading policy GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch grading policy' }, { status: 500 });
  }
}

/**
 * PUT /api/school/grading-policies
 * Update grading policy for the school
 */
export async function PUT(request: NextRequest) {
  try {
    const schoolId = await getSchoolIdFromRequest(request);

    if (typeof schoolId !== 'string') {
      return NextResponse.json({ error: 'Invalid school ID' }, { status: 400 });
    }

    const validation = await validateSchoolIdAccess(schoolId);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error || 'Invalid school access' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = validateGradingPolicy(body);

    if (!validatedData) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    // Validate weights sum to 100
    const totalWeight = validatedData.class_score_weight + validatedData.exam_score_weight;
    if (totalWeight !== 100) {
      return NextResponse.json(
        { error: 'Class score weight and exam score weight must sum to 100' },
        { status: 400 }
      );
    }

    // Check if policy exists
    const { data: existingPolicy, error: checkError } = await querySchoolGradingPolicies()
      .select('id')
      .eq('school_id', schoolId)
      .single();

    let result;

    if (existingPolicy && !checkError) {
      // Update existing policy
      result = await getServerSupabaseClient()
        .from('school_grading_policies')
        .update({
          class_score_weight: validatedData.class_score_weight,
          exam_score_weight: validatedData.exam_score_weight,
          grade_scale: validatedData.grade_scale,
          remarks_scale: validatedData.remarks_scale,
          updated_at: new Date().toISOString(),
        })
        .eq('school_id', schoolId)
        .select('*')
        .single();
    } else {
      // Create new policy
      result = await getServerSupabaseClient()
        .from('school_grading_policies')
        .insert({
          school_id: schoolId,
          class_score_weight: validatedData.class_score_weight,
          exam_score_weight: validatedData.exam_score_weight,
          grade_scale: validatedData.grade_scale,
          remarks_scale: validatedData.remarks_scale,
        })
        .select('*')
        .single();
    }

    const { data, error } = result;

    if (error) {
      console.error('[v0] Grading policy PUT error:', error);
      return NextResponse.json({ error: formatSupabaseError(error) }, { status: 400 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('[v0] Grading policy PUT error:', error);
    return NextResponse.json({ error: 'Failed to update grading policy' }, { status: 500 });
  }
}
