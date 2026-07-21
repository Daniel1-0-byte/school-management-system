import { DEFAULT_CURRICULUM } from './default-curriculum';
import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Seeds default classes and subjects for a new school
 * Called when a school is created during signup
 */
export async function seedDefaultCurriculum(supabase: SupabaseClient, schoolId: string) {
  try {
    console.log('[v0] Seeding default curriculum for school:', schoolId);

    // Create all unique subjects first
    const allSubjects = new Set<string>();
    DEFAULT_CURRICULUM.forEach(({ subjects }) => {
      subjects.forEach(subject => allSubjects.add(subject));
    });

    // Insert subjects into subjects table
    const subjectsList = Array.from(allSubjects).map(name => ({
      name,
      school_id: schoolId,
    }));

    const { data: createdSubjects, error: subjectError } = await supabase
      .from('subjects')
      .insert(subjectsList)
      .select('id, name');

    if (subjectError) {
      console.error('[v0] Failed to seed subjects:', subjectError);
      return false;
    }

    // Create map of subject names to IDs for easy lookup
    const subjectMap = new Map<string, string>();
    createdSubjects?.forEach(subject => {
      subjectMap.set(subject.name, subject.id);
    });

    // Insert classes
    for (const { className, subjects } of DEFAULT_CURRICULUM) {
      const { data: classData, error: classError } = await supabase
        .from('school_classes')
        .insert({
          name: className,
          section: 'A', // Default section
          school_id: schoolId,
        })
        .select('id')
        .single();

      if (classError) {
        console.error(`[v0] Failed to create class ${className}:`, classError);
        continue;
      }

      // Link subjects to this class
      const classSubjectLinks = subjects
        .map(subjectName => {
          const subjectId = subjectMap.get(subjectName);
          if (!subjectId) {
            console.warn(`[v0] Subject not found: ${subjectName}`);
            return null;
          }
          return {
            class_id: classData.id,
            subject_id: subjectId,
          };
        })
        .filter(link => link !== null);

      if (classSubjectLinks.length > 0) {
        const { error: linkError } = await supabase
          .from('class_subjects')
          .insert(classSubjectLinks);

        if (linkError) {
          console.error(`[v0] Failed to link subjects for class ${className}:`, linkError);
        }
      }
    }

    console.log('[v0] Successfully seeded default curriculum for school:', schoolId);
    return true;
  } catch (error) {
    console.error('[v0] Error seeding curriculum:', error);
    return false;
  }
}
