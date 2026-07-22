import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSchoolIdFromRequest, validateSchoolIdAccess } from '@/lib/auth-utils';
import { queryStudents, queryClasses, querySubjects, queryAttendance, queryGrades, queryAcademicYears, queryTerms, queryStudentEnrollments, queryTeacherAssignments, queryGuardians, queryPickupPersons } from '@/lib/supabase';

const bulkImportSchema = z.object({
  school_id: z.string().uuid(),
  module_name: z.string(),
  rows_to_create: z.array(z.record(z.any())),
  rows_to_update: z.array(z.record(z.any())),
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
    const { module_name, rows_to_create, rows_to_update } = bulkImportSchema.parse(body);

    let created = 0;
    let updated = 0;

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

    // Insert new records
    if (rows_to_create.length > 0) {
      const createRecords = rows_to_create.map((row) => ({
        ...row,
        school_id: schoolId,
      }));

      const { error: createError } = await queryFunc().insert(createRecords);
      if (createError) {
        console.error('[v0] Bulk import create error:', createError);
        return NextResponse.json(
          { error: `Failed to create records: ${createError.message}` },
          { status: 400 }
        );
      }
      created = createRecords.length;
    }

    // Update existing records
    if (rows_to_update.length > 0) {
      for (const row of rows_to_update) {
        const { error: updateError } = await queryFunc()
          .update(row)
          .eq('school_id', schoolId);

        if (!updateError) {
          updated++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      created,
      updated,
      total: created + updated,
    });
  } catch (error) {
    console.error('[v0] Bulk import error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Import failed' },
      { status: 500 }
    );
  }
}
