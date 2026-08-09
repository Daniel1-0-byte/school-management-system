import {
  getServerSupabaseClient,
  queryAcademicYears,
  queryStudents,
} from '@/lib/supabase';

const MAX_GENERATION_ATTEMPTS = 5;

export async function generateAdmissionNumber(schoolId: string): Promise<string> {
  const { data: academicYear, error: academicYearError } = await queryAcademicYears()
    .select('id, year')
    .eq('school_id', schoolId)
    .order('start_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (academicYearError || !academicYear) {
    throw new Error(
      academicYearError?.message ||
        'Create an academic year before adding students'
    );
  }

  for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt++) {
    const { data: counter, error: counterError } =
      await getServerSupabaseClient().rpc('next_admission_number_counter', {
        p_school_id: schoolId,
        p_academic_year_id: academicYear.id,
      });

    if (counterError || typeof counter !== 'number') {
      throw new Error(counterError?.message || 'Failed to generate admission number');
    }

    const admissionNumber = `ADM-${academicYear.year}-${String(counter).padStart(4, '0')}`;
    const { data: existing, error: existingError } = await queryStudents()
      .select('id')
      .eq('school_id', schoolId)
      .eq('admission_number', admissionNumber)
      .maybeSingle();

    if (existingError) throw new Error(existingError.message);
    if (!existing) return admissionNumber;
  }

  throw new Error('Unable to generate a unique admission number');
}
