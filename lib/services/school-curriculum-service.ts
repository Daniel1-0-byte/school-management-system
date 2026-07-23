import { getServerSupabaseClient, queryCurriculums, querySystemClasses, querySystemClassSubjects, querySchoolClassStreams, querySchoolClassStreamSubjects, queryAcademicYears } from '@/lib/supabase';

/**
 * Service to handle curriculum adoption and setup for schools
 * Schools activate a curriculum and then create streams based on system classes
 */
export class SchoolCurriculumService {
  /**
   * Activate a curriculum for a school
   * This sets the active curriculum ID for the school
   */
  static async activateCurriculumForSchool(
    schoolId: string,
    curriculumId: string
  ): Promise<{ data?: any; error?: string }> {
    try {
      const supabase = getServerSupabaseClient();

      const { data, error } = await supabase
        .from('schools')
        .update({
          active_curriculum_id: curriculumId,
          curriculum_status: 'active',
          updated_at: new Date().toISOString(),
        })
        .eq('id', schoolId);

      if (error) {
        return { error: error.message };
      }

      return { data };
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Failed to activate curriculum' };
    }
  }

  /**
   * Get the active curriculum for a school
   */
  static async getActiveSchoolCurriculum(schoolId: string): Promise<{ data?: any; error?: string }> {
    try {
      const supabase = getServerSupabaseClient();

      const { data: schoolData, error: schoolError } = await supabase
        .from('schools')
        .select('active_curriculum_id, curriculum_status')
        .eq('id', schoolId)
        .single();

      if (schoolError) {
        return { error: schoolError.message };
      }

      if (!schoolData?.active_curriculum_id) {
        return { data: null };
      }

      const { data: curriculumData, error: curriculumError } = await queryCurriculums()
        .select('*')
        .eq('id', schoolData.active_curriculum_id)
        .single();

      if (curriculumError) {
        return { error: curriculumError.message };
      }

      return { data: { ...curriculumData, status: schoolData.curriculum_status } };
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Failed to fetch active curriculum' };
    }
  }

  /**
   * Seed initial streams from system curriculum to a school
   * This creates one stream per system class for the current academic year
   */
  static async seedInitialStreamsFromCurriculum(
    schoolId: string,
    curriculumId: string,
    academicYearId?: string
  ): Promise<{ data?: any; error?: string; streamsCreated?: number }> {
    try {
      const supabase = getServerSupabaseClient();

      // If no academic year provided, get the current one
      let activeAcademicYearId = academicYearId;
      if (!activeAcademicYearId) {
        const { data: yearData, error: yearError } = await queryAcademicYears()
          .select('id')
          .eq('school_id', schoolId)
          .eq('status', 'active')
          .limit(1);

        if (yearError || !yearData || yearData.length === 0) {
          return { error: 'No active academic year found. Please create one first.' };
        }

        activeAcademicYearId = yearData[0].id;
      }

      // Get all classes for this curriculum
      const { data: systemClasses, error: classesError } = await querySystemClasses()
        .select('*')
        .eq('curriculum_id', curriculumId)
        .order('order', { ascending: true });

      if (classesError || !systemClasses) {
        return { error: 'Failed to fetch system classes' };
      }

      // Create one stream per class
      const streamsToCreate = systemClasses.map((sc) => ({
        school_id: schoolId,
        academic_year_id: activeAcademicYearId,
        system_class_id: sc.id,
        stream_name: sc.name, // Default stream name is the class name
        capacity: null,
        class_teacher_id: null,
        status: 'active',
      }));

      const { data: createdStreams, error: createError } = await querySchoolClassStreams().insert(streamsToCreate);

      if (createError) {
        return { error: `Failed to create streams: ${createError.message}` };
      }

      // For each created stream, populate subjects from system curriculum
      if (createdStreams && createdStreams.length > 0) {
        for (const stream of createdStreams) {
          // Get subjects for this system class
          const { data: classSubjects } = await querySystemClassSubjects()
            .select('system_subject_id, is_core')
            .eq('system_class_id', stream.system_class_id);

          if (classSubjects && classSubjects.length > 0) {
            const subjectsToInsert = classSubjects.map((cs) => ({
              stream_id: stream.id,
              system_subject_id: cs.system_subject_id,
              is_core: cs.is_core,
            }));

            await querySchoolClassStreamSubjects().insert(subjectsToInsert);
          }
        }
      }

      // Update school curriculum status to active
      await this.activateCurriculumForSchool(schoolId, curriculumId);

      return {
        data: createdStreams,
        streamsCreated: createdStreams?.length || 0,
      };
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Failed to seed streams' };
    }
  }

  /**
   * Check if school has already been set up with curriculum
   */
  static async isSchoolCurriculumSetup(schoolId: string): Promise<{ isSetup: boolean; error?: string }> {
    try {
      const { data, error } = await getServerSupabaseClient()
        .from('schools')
        .select('active_curriculum_id, curriculum_status')
        .eq('id', schoolId)
        .single();

      if (error) {
        return { isSetup: false, error: error.message };
      }

      return {
        isSetup: !!(data?.active_curriculum_id && data?.curriculum_status === 'active'),
      };
    } catch (err) {
      return {
        isSetup: false,
        error: err instanceof Error ? err.message : 'Failed to check curriculum setup',
      };
    }
  }

  /**
   * Get available academic years for a school
   */
  static async getSchoolAcademicYears(schoolId: string): Promise<{ data?: any[]; error?: string }> {
    try {
      const { data, error } = await queryAcademicYears()
        .select('*')
        .eq('school_id', schoolId)
        .order('start_date', { ascending: false });

      if (error) {
        return { error: error.message };
      }

      return { data: data || [] };
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Failed to fetch academic years' };
    }
  }
}
