import { NextRequest, NextResponse } from 'next/server';
import { queryGradeEntriesWithAssessment, formatSupabaseError, getServerSupabaseClient, queryAssessments } from '@/lib/supabase';
import { getSchoolIdFromRequest, validateSchoolIdAccess } from '@/lib/auth-utils';
import { validateGradeEntry, validateBulkGradeEntry } from '@/lib/schemas';

/**
 * GET /api/school/grade-entries
 * Fetch grade entries for the authenticated user's school
 * Supports filtering by: assessment_id, student_id, status
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

    // Get query parameters for filtering
    const assessmentId = request.nextUrl.searchParams.get('assessment_id');
    const studentId = request.nextUrl.searchParams.get('student_id');
    const status = request.nextUrl.searchParams.get('status');

    // Build query
    let query = queryGradeEntriesWithAssessment()
      .eq('school_id', schoolId)
      .order('created_at', { ascending: false });

    // Apply filters
    if (assessmentId) query = query.eq('assessment_id', assessmentId);
    if (studentId) query = query.eq('student_id', studentId);
    if (status) query = query.eq('submission_status', status);

    const { data, error } = await query;

    if (error) {
      console.error('[v0] Grade entries GET error:', error);
      return NextResponse.json({ error: formatSupabaseError(error) }, { status: 400 });
    }

    return NextResponse.json({ data: data || [] });
  } catch (error) {
    console.error('[v0] Grade entries GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch grade entries' }, { status: 500 });
  }
}

/**
 * POST /api/school/grade-entries
 * Create or update a single grade entry
 */
export async function POST(request: NextRequest) {
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
    const validatedData = validateGradeEntry(body);

    if (!validatedData) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    // Verify assessment exists and belongs to school
    const { data: assessment, error: assessmentError } = await queryAssessments()
      .select('id, school_id, status, max_marks')
      .eq('id', validatedData.assessment_id)
      .eq('school_id', schoolId)
      .single();

    if (assessmentError || !assessment) {
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
    }

    // Calculate total_score from class_score and exam_score
    let totalScore = null;
    if (validatedData.class_score !== null && validatedData.exam_score !== null) {
      totalScore = validatedData.class_score + validatedData.exam_score;
    } else if (validatedData.class_score !== null) {
      totalScore = validatedData.class_score;
    } else if (validatedData.exam_score !== null) {
      totalScore = validatedData.exam_score;
    }

    // Check if grade entry already exists for this student+assessment
    const { data: existingEntry } = await getServerSupabaseClient()
      .from('grade_entries')
      .select('id')
      .eq('student_id', validatedData.student_id)
      .eq('assessment_id', validatedData.assessment_id)
      .eq('school_id', schoolId)
      .single();

    let result;
    if (existingEntry) {
      // Update existing entry
      result = await getServerSupabaseClient()
        .from('grade_entries')
        .update({
          class_score: validatedData.class_score,
          exam_score: validatedData.exam_score,
          total_score: totalScore,
          recorded_by: validatedData.recorded_by,
          submission_status: 'draft',
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingEntry.id)
        .eq('school_id', schoolId)
        .select('*')
        .single();
    } else {
      // Create new entry
      result = await getServerSupabaseClient()
        .from('grade_entries')
        .insert({
          school_id: schoolId,
          student_id: validatedData.student_id,
          assessment_id: validatedData.assessment_id,
          class_score: validatedData.class_score,
          exam_score: validatedData.exam_score,
          total_score: totalScore,
          recorded_by: validatedData.recorded_by,
          submission_status: 'draft',
        })
        .select('*')
        .single();
    }

    const { data, error } = result;

    if (error) {
      console.error('[v0] Grade entry POST error:', error);
      return NextResponse.json({ error: formatSupabaseError(error) }, { status: 400 });
    }

    // Update assessment progress
    const { count: progressCount } = await getServerSupabaseClient()
      .from('grade_entries')
      .select('*', { count: 'exact', head: true })
      .eq('assessment_id', validatedData.assessment_id)
      .eq('school_id', schoolId)
      .not('total_score', 'is', null);

    await getServerSupabaseClient()
      .from('assessments')
      .update({ progress_count: progressCount || 0, last_modified: new Date().toISOString() })
      .eq('id', validatedData.assessment_id)
      .eq('school_id', schoolId);

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error('[v0] Grade entry POST error:', error);
    return NextResponse.json({ error: 'Failed to create grade entry' }, { status: 500 });
  }
}

/**
 * PUT /api/school/grade-entries
 * Bulk update grade entries for an assessment
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
    const validatedData = validateBulkGradeEntry(body);

    if (!validatedData) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    // Verify assessment exists
    const { data: assessment } = await queryAssessments()
      .select('id, school_id, status')
      .eq('id', validatedData.assessment_id)
      .eq('school_id', schoolId)
      .single();

    if (!assessment) {
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
    }

    // Process all entries (upsert pattern)
    const upsertedEntries = [];

    for (const entry of validatedData.entries) {
      // Calculate total_score
      let totalScore = null;
      if (entry.class_score !== null && entry.exam_score !== null) {
        totalScore = entry.class_score + entry.exam_score;
      } else if (entry.class_score !== null) {
        totalScore = entry.class_score;
      } else if (entry.exam_score !== null) {
        totalScore = entry.exam_score;
      }

      // Check if exists
      const { data: existing } = await getServerSupabaseClient()
        .from('grade_entries')
        .select('id')
        .eq('student_id', entry.student_id)
        .eq('assessment_id', validatedData.assessment_id)
        .eq('school_id', schoolId)
        .single();

      if (existing) {
        // Update
        const { data: updated } = await getServerSupabaseClient()
          .from('grade_entries')
          .update({
            class_score: entry.class_score,
            exam_score: entry.exam_score,
            total_score: totalScore,
            recorded_by: entry.recorded_by,
            submission_status: 'draft',
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
          .select('*')
          .single();

        if (updated) upsertedEntries.push(updated);
      } else {
        // Create
        const { data: created } = await getServerSupabaseClient()
          .from('grade_entries')
          .insert({
            school_id: schoolId,
            student_id: entry.student_id,
            assessment_id: validatedData.assessment_id,
            class_score: entry.class_score,
            exam_score: entry.exam_score,
            total_score: totalScore,
            recorded_by: entry.recorded_by,
            submission_status: 'draft',
          })
          .select('*')
          .single();

        if (created) upsertedEntries.push(created);
      }
    }

    // Update assessment progress
    const { count: progressCount } = await getServerSupabaseClient()
      .from('grade_entries')
      .select('*', { count: 'exact', head: true })
      .eq('assessment_id', validatedData.assessment_id)
      .eq('school_id', schoolId)
      .not('total_score', 'is', null);

    await getServerSupabaseClient()
      .from('assessments')
      .update({ progress_count: progressCount || 0, last_modified: new Date().toISOString() })
      .eq('id', validatedData.assessment_id)
      .eq('school_id', schoolId);

    return NextResponse.json({ data: upsertedEntries });
  } catch (error) {
    console.error('[v0] Grade entries PUT error:', error);
    return NextResponse.json({ error: 'Failed to bulk update grade entries' }, { status: 500 });
  }
}
