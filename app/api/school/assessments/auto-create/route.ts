import { NextRequest, NextResponse } from 'next/server';
import { formatSupabaseError, getServerSupabaseClient } from '@/lib/supabase';
import { getSchoolIdFromRequest, validateSchoolIdAccess, requireGradeStreamAccess } from '@/lib/auth-utils';

/**
 * POST /api/school/assessments/auto-create
 * Automatically create an assessment for a subject/stream/term combination if it doesn't exist
 * Used by GradeDashboard to ensure an assessment exists before grading
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
    const { subject_id, stream_id, term_id } = body;

    if (!subject_id || !stream_id || !term_id) {
      return NextResponse.json(
        { error: 'subject_id, stream_id, and term_id are required' },
        { status: 400 }
      );
    }

    const { data: termForAccess, error: termAccessError } = await getServerSupabaseClient()
      .from('terms')
      .select('academic_year_id')
      .eq('id', term_id)
      .eq('school_id', schoolId)
      .single();
    if (termAccessError || !termForAccess?.academic_year_id) {
      return NextResponse.json({ error: 'Invalid term' }, { status: 404 });
    }

    const gradeAccessError = await requireGradeStreamAccess(
      request,
      schoolId,
      stream_id,
      termForAccess.academic_year_id
    );
    if (gradeAccessError) return gradeAccessError;

    // Get the academic year to include in assessment name
    const { data: term, error: termError } = await getServerSupabaseClient()
      .from('terms')
      .select('academic_year_id, type')
      .eq('id', term_id)
      .single();

    if (termError || !term) {
      return NextResponse.json({ error: 'Invalid term' }, { status: 404 });
    }

    // Get subject name for assessment name
    const { data: subject, error: subjectError } = await getServerSupabaseClient()
      .from('subjects')
      .select('name')
      .eq('id', subject_id)
      .single();

    if (subjectError || !subject) {
      return NextResponse.json({ error: 'Invalid subject' }, { status: 404 });
    }

    // Check if assessment already exists
    const { data: existingAssessments, error: searchError } = await getServerSupabaseClient()
      .from('assessments')
      .select('*')
      .eq('school_id', schoolId)
      .eq('academic_year_id', term.academic_year_id)
      .eq('term_id', term_id)
      .eq('stream_id', stream_id)
      .eq('subject_id', subject_id);

    if (searchError) {
      console.error('[v0] Assessment search error:', searchError);
      return NextResponse.json({ error: formatSupabaseError(searchError) }, { status: 400 });
    }

    if (existingAssessments && existingAssessments.length > 0) {
      // Assessment already exists, return it
      console.log('[v0] Assessment already exists:', existingAssessments[0].id);
      return NextResponse.json({ data: existingAssessments[0] });
    }

    // Resolve school_class_id from stream
    const { data: stream, error: streamError } = await getServerSupabaseClient()
      .from('school_class_streams')
      .select('school_class_id')
      .eq('id', stream_id)
      .single();

    if (streamError || !stream?.school_class_id) {
      return NextResponse.json({ error: 'Stream does not have a class assigned' }, { status: 400 });
    }

    // Get enrolled student count for this class
    const { count: studentCount } = await getServerSupabaseClient()
      .from('student_enrollments')
      .select('*', { count: 'exact', head: true })
      .eq('class_id', stream.school_class_id)
      .eq('school_id', schoolId)
      .eq('academic_year_id', term.academic_year_id)
      .eq('status', 'active');

    // Create new assessment with auto-generated name
    const termLabel =
      term.type === 'term_1'
        ? 'Term 1'
        : term.type === 'term_2'
          ? 'Term 2'
          : term.type === 'term_3'
            ? 'Term 3'
            : term.type;
    
    const assessmentName = `${subject.name} - ${termLabel} Assessment`;

    const { data: newAssessment, error: createError } = await getServerSupabaseClient()
      .from('assessments')
      .insert({
        school_id: schoolId,
        academic_year_id: term.academic_year_id,
        term_id: term_id,
        stream_id: stream_id,
        subject_id: subject_id,
        name: assessmentName,
        description: `Auto-created assessment for ${subject.name} in ${termLabel}`,
        assessment_type: 'classwork',
        status: 'not_started',
        total_students: studentCount || 0,
      })
      .select('*')
      .single();

    if (createError) {
      console.error('[v0] Assessment creation error:', createError);
      return NextResponse.json({ error: formatSupabaseError(createError) }, { status: 400 });
    }

    console.log('[v0] Auto-created assessment:', newAssessment.id);
    return NextResponse.json({ data: newAssessment }, { status: 201 });
  } catch (error) {
    console.error('[v0] Auto-create assessment error:', error);
    return NextResponse.json({ error: 'Failed to auto-create assessment' }, { status: 500 });
  }
}
