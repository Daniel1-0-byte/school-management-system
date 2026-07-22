import { SupabaseClient } from '@supabase/supabase-js';
import { GHANA_CURRICULUM_V1 } from '@/lib/curriculum-seed-data';

/**
 * CurriculumService - Manages platform-wide curriculum data
 * Only platform admins can modify curriculum
 * All schools inherit the active curriculum
 */
export class CurriculumService {
  /**
   * Seeds the Ghana Basic School curriculum into the database
   * This should only be called once during platform initialization
   */
  static async seedGhanaCurriculum(supabase: SupabaseClient): Promise<boolean> {
    try {
      console.log('[v0] Starting Ghana curriculum seed...');

      // Check if curriculum already exists
      const { data: existing, error: checkError } = await supabase
        .from('system_curriculums')
        .select('id')
        .eq('version', '1.0')
        .limit(1);

      if (checkError) {
        console.error('[v0] Error checking existing curriculum:', checkError);
        return false;
      }

      if (existing && existing.length > 0) {
        console.log('[v0] Ghana curriculum v1.0 already exists, skipping seed');
        return true;
      }

      // 1. Create curriculum record
      const { data: curriculumData, error: curriculumError } = await supabase
        .from('system_curriculums')
        .insert({
          name: GHANA_CURRICULUM_V1.name,
          version: GHANA_CURRICULUM_V1.version,
          description: GHANA_CURRICULUM_V1.description,
          is_active: GHANA_CURRICULUM_V1.isActive,
        })
        .select('id')
        .single();

      if (curriculumError || !curriculumData) {
        console.error('[v0] Failed to create curriculum:', curriculumError);
        return false;
      }

      const curriculumId = curriculumData.id;
      console.log('[v0] Created curriculum:', curriculumId);

      // 2. Create all subjects
      const { data: subjectsData, error: subjectsError } = await supabase
        .from('system_subjects')
        .insert(
          GHANA_CURRICULUM_V1.subjects.map(subject => ({
            code: subject.code,
            name: subject.name,
            short_name: subject.shortName,
            description: subject.description,
          }))
        )
        .select('id, code');

      if (subjectsError || !subjectsData) {
        console.error('[v0] Failed to create subjects:', subjectsError);
        return false;
      }

      // Create map of subject codes to IDs
      const subjectMap = new Map<string, string>();
      subjectsData.forEach(subject => {
        subjectMap.set(subject.code, subject.id);
      });

      console.log('[v0] Created', subjectsData.length, 'subjects');

      // 3. Create all classes and their subject mappings
      for (const classItem of GHANA_CURRICULUM_V1.classes) {
        const { data: classData, error: classError } = await supabase
          .from('system_classes')
          .insert({
            curriculum_id: curriculumId,
            code: classItem.code,
            name: classItem.name,
            display_order: classItem.displayOrder,
          })
          .select('id')
          .single();

        if (classError || !classData) {
          console.error(`[v0] Failed to create class ${classItem.code}:`, classError);
          continue;
        }

        // 4. Create subject mappings for this class
        const classSubjectMappings = classItem.subjects
          .map(subject => {
            const subjectId = subjectMap.get(subject.code);
            if (!subjectId) {
              console.warn(`[v0] Subject not found: ${subject.code}`);
              return null;
            }
            return {
              class_id: classData.id,
              subject_id: subjectId,
              display_order: subject.displayOrder,
              is_core: subject.isCore,
            };
          })
          .filter((mapping): mapping is NonNullable<typeof mapping> => mapping !== null);

        if (classSubjectMappings.length > 0) {
          const { error: mappingError } = await supabase
            .from('system_class_subjects')
            .insert(classSubjectMappings);

          if (mappingError) {
            console.error(`[v0] Failed to map subjects for class ${classItem.code}:`, mappingError);
          }
        }

        console.log(`[v0] Created class ${classItem.code} with ${classSubjectMappings.length} subjects`);
      }

      console.log('[v0] Ghana curriculum seed completed successfully');
      return true;
    } catch (error) {
      console.error('[v0] Error seeding Ghana curriculum:', error);
      return false;
    }
  }

  /**
   * Get active curriculum
   */
  static async getActiveCurriculum(
    supabase: SupabaseClient
  ): Promise<{ id: string; name: string; version: string } | null> {
    try {
      const { data, error } = await supabase
        .from('system_curriculums')
        .select('id, name, version')
        .eq('is_active', true)
        .limit(1)
        .single();

      if (error) {
        console.error('[v0] Error fetching active curriculum:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('[v0] Error in getActiveCurriculum:', error);
      return null;
    }
  }

  /**
   * Get all classes in active curriculum
   */
  static async getClasses(
    supabase: SupabaseClient,
    curriculumId?: string
  ): Promise<Array<{ id: string; code: string; name: string; displayOrder: number }> | null> {
    try {
      let query = supabase
        .from('system_classes')
        .select('id, code, name, display_order');

      if (curriculumId) {
        query = query.eq('curriculum_id', curriculumId);
      } else {
        // Get active curriculum's classes
        const activeCurriculum = await this.getActiveCurriculum(supabase);
        if (!activeCurriculum) {
          return null;
        }
        query = query.eq('curriculum_id', activeCurriculum.id);
      }

      const { data, error } = await query.order('display_order');

      if (error) {
        console.error('[v0] Error fetching classes:', error);
        return null;
      }

      return data.map(c => ({
        id: c.id,
        code: c.code,
        name: c.name,
        displayOrder: c.display_order,
      }));
    } catch (error) {
      console.error('[v0] Error in getClasses:', error);
      return null;
    }
  }

  /**
   * Get all subjects
   */
  static async getSubjects(
    supabase: SupabaseClient
  ): Promise<Array<{ id: string; code: string; name: string; shortName: string }> | null> {
    try {
      const { data, error } = await supabase
        .from('system_subjects')
        .select('id, code, name, short_name')
        .order('name');

      if (error) {
        console.error('[v0] Error fetching subjects:', error);
        return null;
      }

      return data.map(s => ({
        id: s.id,
        code: s.code,
        name: s.name,
        shortName: s.short_name,
      }));
    } catch (error) {
      console.error('[v0] Error in getSubjects:', error);
      return null;
    }
  }

  /**
   * Get subjects for a specific class
   */
  static async getClassSubjects(
    supabase: SupabaseClient,
    classId: string
  ): Promise<
    Array<{
      id: string;
      subjectId: string;
      code: string;
      name: string;
      isCore: boolean;
      displayOrder: number;
    }>
    | null
  > {
    try {
      const { data, error } = await supabase
        .from('system_class_subjects')
        .select('id, subject_id, display_order, is_core, system_subjects(code, name)')
        .eq('class_id', classId)
        .order('display_order');

      if (error) {
        console.error('[v0] Error fetching class subjects:', error);
        return null;
      }

      return data.map(cs => ({
        id: cs.id,
        subjectId: cs.subject_id,
        code: (cs.system_subjects as any)?.code || '',
        name: (cs.system_subjects as any)?.name || '',
        isCore: cs.is_core,
        displayOrder: cs.display_order,
      }));
    } catch (error) {
      console.error('[v0] Error in getClassSubjects:', error);
      return null;
    }
  }

  /**
   * Get curriculum details with all classes and subjects
   */
  static async getCurriculumDetails(
    supabase: SupabaseClient,
    curriculumId: string
  ): Promise<{
    id: string;
    name: string;
    version: string;
    classes: Array<{
      id: string;
      code: string;
      name: string;
      displayOrder: number;
      subjects: Array<{
        id: string;
        subjectId: string;
        code: string;
        name: string;
        isCore: boolean;
        displayOrder: number;
      }>;
    }>;
  } | null> {
    try {
      // Get curriculum
      const { data: curriculumData, error: curriculumError } = await supabase
        .from('system_curriculums')
        .select('id, name, version')
        .eq('id', curriculumId)
        .single();

      if (curriculumError || !curriculumData) {
        console.error('[v0] Error fetching curriculum:', curriculumError);
        return null;
      }

      // Get classes
      const { data: classesData, error: classesError } = await supabase
        .from('system_classes')
        .select('id, code, name, display_order')
        .eq('curriculum_id', curriculumId)
        .order('display_order');

      if (classesError) {
        console.error('[v0] Error fetching classes:', classesError);
        return null;
      }

      // Get all class subjects with subject details
      const classesWithSubjects = await Promise.all(
        classesData.map(async cls => {
          const subjects = await this.getClassSubjects(supabase, cls.id);
          return {
            id: cls.id,
            code: cls.code,
            name: cls.name,
            displayOrder: cls.display_order,
            subjects: subjects || [],
          };
        })
      );

      return {
        id: curriculumData.id,
        name: curriculumData.name,
        version: curriculumData.version,
        classes: classesWithSubjects,
      };
    } catch (error) {
      console.error('[v0] Error in getCurriculumDetails:', error);
      return null;
    }
  }
}
