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

    // Reuse the school's existing subject pool. Subjects are intentionally not
    // scoped by academic year, so each seed run must avoid creating duplicates.
    const { data: existingSubjects, error: existingSubjectsError } = await supabase
      .from('subjects')
      .select('id, name')
      .eq('school_id', schoolId);

    if (existingSubjectsError) {
      const message = `Failed to load existing subjects: ${existingSubjectsError.message}`;
      console.error('[v0]', message);
      errors.push(message);
    }

    const normalizeSubjectName = (name: string) => name.replace(/\s+/g, ' ').trim().toLocaleLowerCase();
    const subjectMap = new Map<string, string>();

    existingSubjects?.forEach(subject => {
      subjectMap.set(normalizeSubjectName(subject.name), subject.id);
    });

    for (const subjectName of allSubjects) {
      const normalizedName = normalizeSubjectName(subjectName);
      if (subjectMap.has(normalizedName)) continue;

      const { data: createdSubject, error: subjectError } = await supabase
        .from('subjects')
        .insert({ name: subjectName.trim(), school_id: schoolId })
        .select('id, name')
        .single();

      if (subjectError || !createdSubject) {
        const message = `Failed to seed subject ${subjectName}: ${subjectError?.message || 'No subject returned'}`;
        console.error('[v0]', message);
        errors.push(message);
        continue;
      }

      subjectMap.set(normalizeSubjectName(createdSubject.name), createdSubject.id);
    }

    // Insert classes with a stable progression order for future promotions.
    for (const [index, { className, subjects }] of DEFAULT_CURRICULUM.entries()) {
      const { data: classData, error: classError } = await supabase
        .from('school_classes')
        .insert({
          name: className,
          school_id: schoolId,
          academic_year_id: academicYearId,
          display_order: index + 1,
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
          const subjectId = subjectMap.get(normalizeSubjectName(subjectName));
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
