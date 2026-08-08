import { DEFAULT_CURRICULUM } from './default-curriculum';
import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Seeds default classes and subjects for a new school
 * Called when a school is created during signup
 */
export async function seedDefaultCurriculum(
  supabase: SupabaseClient,
  schoolId: string,
  academicYearId: string
): Promise<{ success: boolean; errors: string[] }> {
  const errors: string[] = [];

  try {
    console.log('[v0] Seeding default curriculum for school:', schoolId, 'academic year:', academicYearId);

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
      const message = `Failed to seed subjects: ${subjectError.message}`;
      console.error('[v0]', message);
      errors.push(message);
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
          school_id: schoolId,
          academic_year_id: academicYearId,
        })
        .select('id')
        .single();

      if (classError) {
        const message = `Failed to create class ${className}: ${classError.message}`;
        console.error('[v0]', message);
        errors.push(message);
        continue;
      }

      const { error: streamError } = await supabase
        .from('school_class_streams')
        .insert({
          school_id: schoolId,
          academic_year_id: academicYearId,
          school_class_id: classData.id,
          name: 'A',
          status: 'active',
        });

      if (streamError) {
        const message = `Failed to create default stream for class ${className}: ${streamError.message}`;
        console.error('[v0]', message);
        errors.push(message);
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
              school_id: schoolId,
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
          const message = `Failed to link subjects for class ${className}: ${linkError.message}`;
          console.error('[v0]', message);
          errors.push(message);
        }
      }
    }

    console.log('[v0] Finished seeding default curriculum for school:', schoolId, {
      errors: errors.length,
    });
    return { success: errors.length === 0, errors };
  } catch (error) {
    const message = `Error seeding curriculum: ${error instanceof Error ? error.message : 'Unknown error'}`;
    console.error('[v0]', message);
    errors.push(message);
    return { success: false, errors };
  }
}
