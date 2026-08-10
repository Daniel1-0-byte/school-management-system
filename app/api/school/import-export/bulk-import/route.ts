import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSchoolIdFromRequest, validateSchoolIdAccess } from '@/lib/auth-utils';
import { queryStudents, queryClasses, querySubjects, queryAttendance, queryGrades, queryAcademicYears, queryTerms, queryStudentEnrollments, queryTeacherAssignments, queryGuardians, queryPickupPersons, querySchoolClasses, querySchoolClassStreams } from '@/lib/supabase';
import { getModuleConfig } from '@/lib/import-export/column-definitions';
import { generateAdmissionNumber } from '@/lib/services/admission-number-service';

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

    const accessValidation = await validateSchoolIdAccess(schoolId);
    if (!accessValidation.valid) {
      return NextResponse.json(
        { error: accessValidation.error || 'Forbidden' },
        { status: 403 }
      );
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

    const normalizedModuleName = module_name.toLowerCase();
    const queryFunc = queryMap[normalizedModuleName];
    const moduleConfig = getModuleConfig(normalizedModuleName);
    if (!queryFunc || !moduleConfig) {
      return NextResponse.json(
        { error: `Unknown module: ${module_name}` },
        { status: 400 }
      );
    }

    const allowedFields = new Set(moduleConfig.columns.map((column) => column.csvHeader));
    const sanitizeRow = (row: Record<string, unknown>) =>
      Object.fromEntries(
        Object.entries(row).filter(([field, value]) =>
          allowedFields.has(field) && value !== undefined
        )
      );

    const warnings: Array<{ rowNumber: number; message: string }> = [];

    const createStudentEnrollment = async (
      studentId: string,
      className: unknown,
      rowNumber: number
    ) => {
      if (normalizedModuleName !== 'students' || typeof className !== 'string' || !className.trim()) {
        return;
      }

      const { data: academicYear, error: academicYearError } = await queryAcademicYears()
        .select('id, year')
        .eq('school_id', schoolId)
        .order('start_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (academicYearError) {
        console.error('[v0] Bulk import academic year lookup failed:', {
          rowNumber,
          studentId,
          schoolId,
          academicYearError,
        });
      }

      const normalizedClassName = className.trim();
      const classQuery = querySchoolClasses()
        .select('id, name')
        .eq('school_id', schoolId)
        .ilike('name', normalizedClassName)
        .maybeSingle();
      const { data: schoolClass, error: classError } = await classQuery;

      console.log('[v0] Bulk import class matching:', {
        rowNumber,
        studentId,
        rawClassName: className,
        normalizedClassName,
        schoolId,
        academicYearId: academicYear?.id ?? null,
        schoolClass,
        classError,
      });

      if (classError) {
        warnings.push({
          rowNumber,
          message: `Class lookup failed: ${classError.message}`,
        });
        return;
      }

      if (academicYearError || !academicYear) {
        warnings.push({
          rowNumber,
          message: academicYearError
            ? `Academic year lookup failed: ${academicYearError.message}`
            : 'No academic year was found; no enrollment was created.',
        });
        return;
      }

      if (!schoolClass) {
        warnings.push({
          rowNumber,
          message: `Class "${className}" could not be matched; no enrollment was created.`,
        });
        return;
      }

      const { data: stream, error: streamError } = await querySchoolClassStreams()
        .select('id, name')
        .eq('school_id', schoolId)
        .eq('school_class_id', schoolClass.id)
        .eq('academic_year_id', academicYear.id)
        .eq('status', 'active')
        .order('name', { ascending: true })
        .limit(1)
        .maybeSingle();

      console.log('[v0] Bulk import stream matching:', {
        rowNumber,
        studentId,
        schoolClassId: schoolClass.id,
        academicYearId: academicYear.id,
        stream,
        streamError,
      });

      if (streamError || !stream) {
        warnings.push({
          rowNumber,
          message: streamError
            ? `Stream lookup failed: ${streamError.message}`
            : `No active stream was found for class "${className}"; no enrollment was created.`,
        });
        return;
      }

      const { error: enrollmentError } = await queryStudentEnrollments().insert({
        student_id: studentId,
        school_id: schoolId,
        academic_year_id: academicYear.id,
        school_class_id: schoolClass.id,
        stream_id: stream.id,
        status: 'active',
      });

      if (enrollmentError) {
        warnings.push({
          rowNumber,
          message: `Enrollment could not be created: ${enrollmentError.message}`,
        });
      }
    };

    // Insert new records
    if (rows_to_create.length > 0) {
      if (normalizedModuleName === 'students') {
        for (const row of rows_to_create) {
          let inserted = false;
          for (let attempt = 0; attempt < 5 && !inserted; attempt++) {
            const admissionNumber = await generateAdmissionNumber(schoolId);
            const { error: createError } = await queryStudents()
              .insert({
                ...sanitizeRow(row),
                admission_number: admissionNumber,
                school_id: schoolId,
              });

            if (!createError) {
              inserted = true;
              created++;
              const { data: createdStudent } = await queryStudents()
                .select('id')
                .eq('school_id', schoolId)
                .eq('admission_number', admissionNumber)
                .single();
              if (createdStudent) {
                try {
                  await createStudentEnrollment(
                    createdStudent.id,
                    row.current_class_name,
                    rows_to_create.indexOf(row) + 2
                  );
                } catch (enrollmentError) {
                  console.error('[v0] Bulk import enrollment exception:', {
                    rowNumber: rows_to_create.indexOf(row) + 2,
                    studentId: createdStudent.id,
                    error: enrollmentError,
                  });
                  warnings.push({
                    rowNumber: rows_to_create.indexOf(row) + 2,
                    message: 'Enrollment processing failed unexpectedly; student was still created.',
                  });
                }
              }
              continue;
            }

            if (createError.code !== '23505') {
              console.error('[v0] Bulk import student create error:', createError);
              return NextResponse.json(
                { error: `Failed to create records: ${createError.message}` },
                { status: 400 }
              );
            }
          }

          if (!inserted) {
            return NextResponse.json(
              { error: 'Unable to generate a unique admission number' },
              { status: 409 }
            );
          }
        }
      } else {
        const createRecords = rows_to_create.map((row) => ({
          ...sanitizeRow(row),
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
    }

    // Update existing records
    if (rows_to_update.length > 0) {
      for (const row of rows_to_update) {
        const { error: updateError } = await queryFunc()
          .update(sanitizeRow(row))
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
      warnings,
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
