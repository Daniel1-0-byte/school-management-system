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
  const { data: classSubjectsResponse, error } = await supabase
    .from('class_subjects')
    .select('subject:subjects(id, name, code)')
    .eq('class_id', classId)
    .eq('school_id', schoolId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[v0] Error fetching class subjects:', error);
    throw error;
  }

  // Extract subjects from the nested join response
  // Response format: [{ subject: { id, name, code } }, ...]
  const subjects = (classSubjectsResponse || [])
    .map((item: any) => item.subject)
    .filter((subject: any) => subject !== null);

  return subjects;
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
