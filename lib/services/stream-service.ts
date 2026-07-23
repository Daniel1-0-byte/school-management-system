import { getServerSupabaseClient, querySchoolClassStreams, querySchoolClassStreamSubjects, querySystemClassSubjects, querySystemClasses } from '@/lib/supabase';
import { SupabaseClient } from '@supabase/supabase-js';

export interface CreateStreamInput {
  schoolId: string;
  academicYearId: string;
  systemClassId: string;
  streamName: string;
  capacity?: number;
  classTeacherId?: string | null;
}

export interface StreamWithSubjects {
  id: string;
  schoolId: string;
  academicYearId: string;
  systemClassId: string;
  streamName: string;
  capacity: number | null;
  classTeacherId: string | null;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
  systemClass?: {
    id: string;
    name: string;
    order: number;
  };
  subjects?: Array<{
    id: string;
    systemSubjectId: string;
    isCore: boolean;
    subject?: {
      id: string;
      code: string;
      name: string;
    };
  }>;
}

export class StreamService {
  /**
   * Create a new school class stream
   */
  static async createStream(input: CreateStreamInput): Promise<{ data?: any; error?: string }> {
    try {
      const supabase = getServerSupabaseClient();

      const { data, error } = await querySchoolClassStreams().insert({
        school_id: input.schoolId,
        academic_year_id: input.academicYearId,
        system_class_id: input.systemClassId,
        stream_name: input.streamName,
        capacity: input.capacity || null,
        class_teacher_id: input.classTeacherId || null,
        status: 'active',
      });

      if (error) {
        return { error: error.message };
      }

      // Auto-generate subjects from system curriculum
      if (data && data[0]) {
        const streamId = data[0].id;
        await this.populateStreamSubjects(streamId, input.systemClassId);
      }

      return { data };
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Failed to create stream' };
    }
  }

  /**
   * Get all streams for a school in an academic year
   */
  static async getSchoolStreams(
    schoolId: string,
    academicYearId?: string
  ): Promise<{ data?: StreamWithSubjects[]; error?: string }> {
    try {
      let query = querySchoolClassStreams()
        .select(`
          id,
          school_id,
          academic_year_id,
          system_class_id,
          stream_name,
          capacity,
          class_teacher_id,
          status,
          created_at,
          updated_at,
          system_classes:system_class_id(id, name, order)
        `)
        .eq('school_id', schoolId)
        .order('created_at', { ascending: true });

      if (academicYearId) {
        query = query.eq('academic_year_id', academicYearId);
      }

      const { data, error } = await query;

      if (error) {
        return { error: error.message };
      }

      // For each stream, fetch subjects
      if (data) {
        const streamsWithSubjects = await Promise.all(
          data.map(async (stream) => this.enrichStreamWithSubjects(stream))
        );
        return { data: streamsWithSubjects };
      }

      return { data: [] };
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Failed to fetch streams' };
    }
  }

  /**
   * Get a specific stream with all details
   */
  static async getStreamDetails(streamId: string): Promise<{ data?: StreamWithSubjects; error?: string }> {
    try {
      const { data, error } = await querySchoolClassStreams()
        .select(`
          id,
          school_id,
          academic_year_id,
          system_class_id,
          stream_name,
          capacity,
          class_teacher_id,
          status,
          created_at,
          updated_at,
          system_classes:system_class_id(id, name, order)
        `)
        .eq('id', streamId)
        .single();

      if (error) {
        return { error: error.message };
      }

      if (data) {
        const streamWithSubjects = await this.enrichStreamWithSubjects(data);
        return { data: streamWithSubjects };
      }

      return { error: 'Stream not found' };
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Failed to fetch stream' };
    }
  }

  /**
   * Update a stream
   */
  static async updateStream(
    streamId: string,
    updates: Partial<CreateStreamInput>
  ): Promise<{ data?: any; error?: string }> {
    try {
      const { data, error } = await querySchoolClassStreams()
        .update({
          ...(updates.streamName && { stream_name: updates.streamName }),
          ...(updates.capacity !== undefined && { capacity: updates.capacity }),
          ...(updates.classTeacherId !== undefined && { class_teacher_id: updates.classTeacherId }),
          updated_at: new Date().toISOString(),
        })
        .eq('id', streamId);

      if (error) {
        return { error: error.message };
      }

      return { data };
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Failed to update stream' };
    }
  }

  /**
   * Deactivate a stream
   */
  static async deactivateStream(streamId: string): Promise<{ error?: string }> {
    try {
      const { error } = await querySchoolClassStreams()
        .update({ status: 'inactive', updated_at: new Date().toISOString() })
        .eq('id', streamId);

      if (error) {
        return { error: error.message };
      }

      return {};
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Failed to deactivate stream' };
    }
  }

  /**
   * Get subjects for a stream
   */
  static async getStreamSubjects(streamId: string): Promise<{ data?: any[]; error?: string }> {
    try {
      const { data, error } = await querySchoolClassStreamSubjects()
        .select(`
          id,
          stream_id,
          system_subject_id,
          is_core,
          system_subjects:system_subject_id(id, code, name, description)
        `)
        .eq('stream_id', streamId)
        .order('is_core', { ascending: false });

      if (error) {
        return { error: error.message };
      }

      return { data: data || [] };
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Failed to fetch stream subjects' };
    }
  }

  /**
   * Populate stream subjects from system curriculum
   * Called automatically when a stream is created
   */
  private static async populateStreamSubjects(streamId: string, systemClassId: string): Promise<void> {
    try {
      const supabase = getServerSupabaseClient();

      // Get all subjects for this system class
      const { data: classSubjects, error: classSubjectsError } = await querySystemClassSubjects()
        .select('system_subject_id, is_core')
        .eq('system_class_id', systemClassId);

      if (classSubjectsError || !classSubjects) {
        console.error('[v0] Failed to fetch class subjects:', classSubjectsError);
        return;
      }

      // Insert all subjects for this stream
      const subjectsToInsert = classSubjects.map((cs) => ({
        stream_id: streamId,
        system_subject_id: cs.system_subject_id,
        is_core: cs.is_core,
      }));

      if (subjectsToInsert.length > 0) {
        const { error: insertError } = await querySchoolClassStreamSubjects().insert(subjectsToInsert);

        if (insertError) {
          console.error('[v0] Failed to populate stream subjects:', insertError);
        }
      }
    } catch (err) {
      console.error('[v0] Error populating stream subjects:', err);
    }
  }

  /**
   * Enrich stream with subject details
   */
  private static async enrichStreamWithSubjects(stream: any): Promise<StreamWithSubjects> {
    const { data: subjects } = await this.getStreamSubjects(stream.id);

    return {
      id: stream.id,
      schoolId: stream.school_id,
      academicYearId: stream.academic_year_id,
      systemClassId: stream.system_class_id,
      streamName: stream.stream_name,
      capacity: stream.capacity,
      classTeacherId: stream.class_teacher_id,
      status: stream.status,
      createdAt: stream.created_at,
      updatedAt: stream.updated_at,
      systemClass: stream.system_classes,
      subjects: subjects || [],
    };
  }
}
