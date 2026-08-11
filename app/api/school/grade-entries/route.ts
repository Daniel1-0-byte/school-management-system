import { NextRequest, NextResponse } from 'next/server';
import { queryGradeEntriesWithAssessment, formatSupabaseError, getServerSupabaseClient, queryAssessments } from '@/lib/supabase';
import { getSchoolIdFromRequest, validateSchoolIdAccess, getUserIdFromRequest, requireGradeAssessmentAccess, requireGradeStreamAccess } from '@/lib/auth-utils';
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
    const subjectId = request.nextUrl.searchParams.get('subject_id');
    const streamId = request.nextUrl.searchParams.get('stream_id');
    const studentId = request.nextUrl.searchParams.get('student_id');
    const status = request.nextUrl.searchParams.get('status');

    const gradeAccessError = assessmentId
      ? await requireGradeAssessmentAccess(request, schoolId, assessmentId)
      : streamId
        ? await (async () => {
            const { data: stream } = await getServerSupabaseClient()
              .from('school_class_streams')
              .select('academic_year_id')
              .eq('id', streamId)
              .eq('school_id', schoolId)
              .single();
            return stream?.academic_year_id
              ? requireGradeStreamAccess(request, schoolId, streamId, stream.academic_year_id)
              : NextResponse.json({ error: 'Stream not found' }, { status: 404 });
          })()
        : null;
    if (gradeAccessError) return gradeAccessError;

    // Build query
    let query = queryGradeEntriesWithAssessment()
      .eq('school_id', schoolId)
      .order('created_at', { ascending: false });

    // Apply filters - support both assessment_id and subject_id/stream_id
    if (assessmentId) {
      query = query.eq('assessment_id', assessmentId);
    } else if (subjectId && streamId) {
      // When filtering by subject/stream, we need to join with assessments table
      // For now, fetch all grades and filter in application code
      console.log('[v0] Fetching grades for subject_id:', subjectId, 'stream_id:', streamId);
    }
    
    if (studentId) query = query.eq('student_id', studentId);
    if (status) query = query.eq('submission_status', status);

    const { data, error } = await query;

    if (error) {
      console.error('[v0] Grade entries GET error:', error);
      return NextResponse.json({ error: formatSupabaseError(error) }, { status: 400 });
    }

    // Transform response to include student_name and admission_number
    const transformedData = (data || []).map((entry: any) => {
      const studentName = entry.students
        ? `${entry.students.first_name || ''} ${entry.students.last_name || ''}`.trim()
        : 'Unknown Student';
      
      return {
        id: entry.id,
        student_id: entry.student_id,
        student_name: studentName,
        admission_number: entry.students?.admission_number || 'N/A',
        assessment_id: entry.assessment_id,
        class_score: entry.class_score,
        exam_score: entry.exam_score,
        total_score: entry.total_score,
        letter_grade: entry.letter_grade,
        remarks: entry.remarks,
        submission_status: entry.submission_status,
      };
    });

    return NextResponse.json({ data: transformedData || [] });
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

    const gradeAccessError = await requireGradeAssessmentAccess(request, schoolId, validatedData.assessment_id);
    if (gradeAccessError) return gradeAccessError;

    // Verify assessment exists and belongs to school
    const { data: assessment, error: assessmentError } = await queryAssessments()
      .select('id, school_id, status, max_marks')
      .eq('id', validatedData.assessment_id)
      .eq('school_id', schoolId)
      .single();

    if (assessmentError || !assessment) {
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
    }

    // Fetch school's grading policy
    const { data: policy } = await getServerSupabaseClient()
      .from('school_grading_policies')
      .select('class_score_weight, exam_score_weight, grade_scale')
      .eq('school_id', schoolId)
      .single();

    const classWeight = (policy?.class_score_weight ?? 30) / 100;
    const examWeight = (policy?.exam_score_weight ?? 70) / 100;
    const gradeScale = policy?.grade_scale ?? { A: 80, B: 70, C: 60, D: 50, F: 0 };

    // Calculate total_score using weights
    let totalScore: number | null = null;
    let letterGrade: string | null = null;
    const classScore = validatedData.class_score ?? null;
    const examScore = validatedData.exam_score ?? null;

    if (classScore !== null && examScore !== null) {
      totalScore = (classScore * classWeight) + (examScore * examWeight);
      letterGrade =
        totalScore >= gradeScale.A ? 'A' :
        totalScore >= gradeScale.B ? 'B' :
        totalScore >= gradeScale.C ? 'C' :
        totalScore >= gradeScale.D ? 'D' : 'F';
    } else if (classScore !== null) {
      totalScore = classScore;
      letterGrade =
        totalScore >= gradeScale.A ? 'A' :
        totalScore >= gradeScale.B ? 'B' :
        totalScore >= gradeScale.C ? 'C' :
        totalScore >= gradeScale.D ? 'D' : 'F';
    } else if (examScore !== null) {
      totalScore = examScore;
      letterGrade =
        totalScore >= gradeScale.A ? 'A' :
        totalScore >= gradeScale.B ? 'B' :
        totalScore >= gradeScale.C ? 'C' :
        totalScore >= gradeScale.D ? 'D' : 'F';
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
          letter_grade: letterGrade,
              teacher_id: validatedData.teacher_id ?? null,
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
          letter_grade: letterGrade,
              teacher_id: validatedData.teacher_id ?? null,
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
    const authenticatedUserId = getUserIdFromRequest(request);

    if (typeof schoolId !== 'string') {
      return NextResponse.json({ error: 'Invalid school ID' }, { status: 400 });
    }

    if (!authenticatedUserId) {
      return NextResponse.json({ error: 'User authentication required' }, { status: 401 });
    }

    const validation = await validateSchoolIdAccess(schoolId);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error || 'Invalid school access' }, { status: 403 });
    }

    const body = await request.json();
    
    // Filter out entries with both scores null before validation
    // This allows partial saves where some students have no grades yet
    const filteredBody = {
      assessment_id: body.assessment_id,
      entries: (body.entries || []).filter((entry: any) => 
        entry.class_score !== null || entry.exam_score !== null
      ),
    };

    // If no entries have scores, return empty result
    if (filteredBody.entries.length === 0) {
      return NextResponse.json({ data: [] });
    }

    const validatedData = validateBulkGradeEntry(filteredBody);

    if (!validatedData) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    // Fetch assessment with subject_id and term_id (required fields in schema)
    const { data: assessment, error: assessmentError } = await queryAssessments()
      .select('id, school_id, status, subject_id, term_id, academic_year_id')
      .eq('id', validatedData.assessment_id)
      .eq('school_id', schoolId)
      .single();

    if (assessmentError || !assessment) {
      console.error('[v0] Assessment lookup failed:', assessmentError);
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
    }

    if (!assessment.subject_id || !assessment.term_id) {
      console.error('[v0] Assessment missing subject_id or term_id:', assessment);
      return NextResponse.json({ error: 'Assessment configuration incomplete' }, { status: 400 });
    }

    console.log('[v0] Processing bulk grade update for assessment:', validatedData.assessment_id, 'subject:', assessment.subject_id, 'term:', assessment.term_id);

    // Fetch school's grading policy once before processing entries
    const { data: policy } = await getServerSupabaseClient()
      .from('school_grading_policies')
      .select('class_score_weight, exam_score_weight, grade_scale')
      .eq('school_id', schoolId)
      .single();

    const classWeight = (policy?.class_score_weight ?? 30) / 100;
    const examWeight = (policy?.exam_score_weight ?? 70) / 100;
    const gradeScale = policy?.grade_scale ?? { A: 80, B: 70, C: 60, D: 50, F: 0 };

    // Process all entries (upsert pattern)
    const upsertedEntries = [];
    const errors = [];

    for (const entry of validatedData.entries) {
      // Calculate total_score using weights and letter_grade
      let totalScore: number | null = null;
      let letterGrade: string | null = null;
      const classScore = entry.class_score ?? null;
      const examScore = entry.exam_score ?? null;

      if (classScore !== null && examScore !== null) {
        totalScore = (classScore * classWeight) + (examScore * examWeight);
        letterGrade =
          totalScore >= gradeScale.A ? 'A' :
          totalScore >= gradeScale.B ? 'B' :
          totalScore >= gradeScale.C ? 'C' :
          totalScore >= gradeScale.D ? 'D' : 'F';
      } else if (classScore !== null) {
        totalScore = classScore;
        letterGrade =
          totalScore >= gradeScale.A ? 'A' :
          totalScore >= gradeScale.B ? 'B' :
          totalScore >= gradeScale.C ? 'C' :
          totalScore >= gradeScale.D ? 'D' : 'F';
      } else if (examScore !== null) {
        totalScore = examScore;
        letterGrade =
          totalScore >= gradeScale.A ? 'A' :
          totalScore >= gradeScale.B ? 'B' :
          totalScore >= gradeScale.C ? 'C' :
          totalScore >= gradeScale.D ? 'D' : 'F';
      }

      try {
        // Check if exists
        const { data: existing, error: existingError } = await getServerSupabaseClient()
          .from('grade_entries')
          .select('id')
          .eq('student_id', entry.student_id)
          .eq('assessment_id', validatedData.assessment_id)
          .eq('school_id', schoolId)
          .single();

        if (existingError && existingError.code !== 'PGRST116') {
          // PGRST116 is "no rows returned" which is expected
          throw existingError;
        }

        if (existing) {
          // Update existing entry
          // recorded_by is always the authenticated user (security: cannot be overridden by frontend)
          // teacher_id can be provided from frontend, or null if no teacher is assigned
          const { data: updated, error: updateError } = await getServerSupabaseClient()
            .from('grade_entries')
            .update({
              class_score: entry.class_score,
              exam_score: entry.exam_score,
              total_score: totalScore,
              letter_grade: letterGrade,
              teacher_id: entry.teacher_id ?? null,
              recorded_by: authenticatedUserId,
              submission_status: 'draft',
              updated_at: new Date().toISOString(),
            })
            .eq('id', existing.id)
            .eq('school_id', schoolId)
            .select('*')
            .single();

          if (updateError) {
            console.error('[v0] Grade update error for student', entry.student_id, ':', updateError);
            errors.push({ student_id: entry.student_id, error: formatSupabaseError(updateError) });
          } else if (updated) {
            console.log('[v0] Updated grade for student:', entry.student_id, 'teacher_id:', entry.teacher_id ?? 'none', 'recorded_by:', authenticatedUserId);
            upsertedEntries.push(updated);
          }
        } else {
          // Create new entry with all required fields
          // recorded_by is always the authenticated user (security: cannot be overridden by frontend)
          // teacher_id is optional and derived from frontend or set to null
          const { data: created, error: createError } = await getServerSupabaseClient()
            .from('grade_entries')
            .insert({
              school_id: schoolId,
              student_id: entry.student_id,
              assessment_id: validatedData.assessment_id,
              subject_id: assessment.subject_id,
              term_id: assessment.term_id,
              class_score: entry.class_score,
              exam_score: entry.exam_score,
              total_score: totalScore,
              letter_grade: letterGrade,
              teacher_id: entry.teacher_id ?? null,
              recorded_by: authenticatedUserId,
              submission_status: 'draft',
            })
            .select('*')
            .single();

          if (createError) {
            console.error('[v0] Grade create error for student', entry.student_id, ':', createError);
            errors.push({ student_id: entry.student_id, error: formatSupabaseError(createError) });
          } else if (created) {
            console.log('[v0] Created grade entry for student:', entry.student_id, 'teacher_id:', entry.teacher_id ?? 'none', 'recorded_by:', authenticatedUserId);
            upsertedEntries.push(created);
          }
        }
      } catch (entryError) {
        console.error('[v0] Error processing entry for student', entry.student_id, ':', entryError);
        errors.push({ student_id: entry.student_id, error: 'Failed to process grade' });
      }
    }

    // If all entries failed, return error
    if (upsertedEntries.length === 0 && errors.length > 0) {
      console.error('[v0] All grade entries failed:', errors);
      return NextResponse.json({ 
        error: 'Failed to save grades',
        details: errors 
      }, { status: 400 });
    }

    // Update assessment progress
    const { count: progressCount, error: countError } = await getServerSupabaseClient()
      .from('grade_entries')
      .select('*', { count: 'exact', head: true })
      .eq('assessment_id', validatedData.assessment_id)
      .eq('school_id', schoolId)
      .not('total_score', 'is', null);

    if (!countError) {
      const { error: updateError } = await getServerSupabaseClient()
        .from('assessments')
        .update({ progress_count: progressCount || 0, last_modified: new Date().toISOString() })
        .eq('id', validatedData.assessment_id)
        .eq('school_id', schoolId);

      if (updateError) {
        console.error('[v0] Failed to update assessment progress:', updateError);
      }
    }

    console.log('[v0] Grade bulk update complete. Saved:', upsertedEntries.length, 'entries. Errors:', errors.length);
    
    return NextResponse.json({ 
      data: upsertedEntries,
      success: true,
      message: `Saved ${upsertedEntries.length} grade entries`,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('[v0] Grade entries PUT error:', error);
    const errorMsg = error instanceof Error ? error.message : 'Failed to bulk update grade entries';
    return NextResponse.json({ error: errorMsg, details: String(error) }, { status: 500 });
  }
}
