import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Shared utility to fetch class subjects using the exact same logic everywhere.
 * Prevents duplication and ensures consistency across all features.
 * 
 * Used by:
 * - /api/school/subjects (SubjectSelector in Grade Entry)
 * - /api/school/grades/completion-status (Grade completion check)
 * - /api/school/reports/report-cards (Report card data)
 */
export async function fetchClassSubjects(
  supabase: SupabaseClient,
  classId: string,
  schoolId: string
) {
  const { data: assignments, error: assignmentsError } = await supabase
    .from('class_subjects')
    .select('subject_id, created_at')
    .eq('class_id', classId)
    .eq('school_id', schoolId)
    .order('created_at', { ascending: true });

  if (assignmentsError) {
    console.error('[v0] Error fetching class subject assignments:', assignmentsError);
    throw assignmentsError;
  }

  const subjectIds = (assignments || []).map((assignment) => assignment.subject_id).filter(Boolean);
  if (subjectIds.length === 0) return [];

  const { data: subjects, error: subjectsError } = await supabase
    .from('subjects')
    .select('id, name, code')
    .in('id', subjectIds);

  if (subjectsError) {
    console.error('[v0] Error fetching assigned subjects:', subjectsError);
    throw subjectsError;
  }

  const subjectsById = new Map((subjects || []).map((subject) => [subject.id, subject]));
  return subjectIds.map((id) => subjectsById.get(id)).filter(Boolean);
}

/**
 * Same as above but returns the raw response with subject IDs
 * Useful when you need both the subjects and their IDs
 */
export function extractSubjectIds(subjects: any[]) {
  return subjects.map(s => s.id).filter(Boolean);
}

/**
 * Resolve a school stream to its class and fetch the class's subjects.
 * Streams do not have their own subject assignments; class_subjects is the
 * authoritative relationship for both the grades and subject-selector flows.
 */
export async function fetchSubjectsForStream(
  supabase: SupabaseClient,
  streamId: string,
  schoolId: string
) {
  const { data: stream, error: streamError } = await supabase
    .from('school_class_streams')
    .select('school_class_id')
    .eq('id', streamId)
    .eq('school_id', schoolId)
    .single();

  if (streamError || !stream?.school_class_id) {
    throw streamError || new Error('Stream does not have a class assigned');
  }

  const subjects = await fetchClassSubjects(
    supabase,
    stream.school_class_id,
    schoolId
  );

  return {
    schoolClassId: stream.school_class_id,
    subjects,
  };
}
