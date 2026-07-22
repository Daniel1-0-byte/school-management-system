import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSchoolIdFromRequest, validateSchoolIdAccess } from '@/lib/auth-utils';
import { queryStudents, queryClasses, querySubjects, queryAttendance, queryGrades, queryAcademicYears, queryTerms, queryStudentEnrollments, queryTeacherAssignments, queryGuardians, queryPickupPersons } from '@/lib/supabase';

const exportSchema = z.object({
  school_id: z.string().uuid(),
  module_name: z.string(),
  scope: z.enum(['current_page', 'filtered', 'selected', 'entire']),
  filters: z.record(z.any()).optional(),
  selected_ids: z.array(z.string()).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const schoolId = await getSchoolIdFromRequest(request);
    if (!schoolId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const accessError = await validateSchoolIdAccess(schoolId);
    if (accessError) {
      return NextResponse.json({ error: accessError }, { status: 403 });
    }

    const body = await request.json();
    const { module_name, scope, filters, selected_ids } = exportSchema.parse(body);

    // Map module name to query function
    const queryMap: Record<string, any> = {
      students: queryStudents,
      classes: queryClasses,
      subjects: querySubjects,
      attendance: queryAttendance,
      grades: queryGrades,
      academic_years: queryAcademicYears,
      terms: queryTerms,
      enrollments: queryStudentEnrollments,
      teacher_assignments: queryTeacherAssignments,
      guardians: queryGuardians,
      pickup_persons: queryPickupPersons,
    };

    const queryFunc = queryMap[module_name.toLowerCase()];
    if (!queryFunc) {
      return NextResponse.json(
        { error: `Unknown module: ${module_name}` },
        { status: 400 }
      );
    }

    let query = queryFunc().select('*').eq('school_id', schoolId);

    // Apply scope filters
    if (scope === 'selected' && selected_ids && selected_ids.length > 0) {
      query = query.in('id', selected_ids);
    } else if (scope === 'filtered' && filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          query = query.eq(key, value);
        }
      });
    }
    // 'current_page' and 'entire' return all records for the school (already filtered)

    const { data: records, error } = await query;

    if (error) {
      console.error('[v0] Export error:', error);
      return NextResponse.json(
        { error: 'Export failed' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      records: records || [],
      count: (records || []).length,
    });
  } catch (error) {
    console.error('[v0] Export error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Export failed' },
      { status: 500 }
    );
  }
}
