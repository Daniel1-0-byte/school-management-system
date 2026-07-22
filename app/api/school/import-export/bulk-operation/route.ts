import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSchoolIdFromRequest, validateSchoolIdAccess } from '@/lib/auth-utils';
import { queryStudents, queryClasses, querySubjects, queryAttendance, queryGrades, queryAcademicYears, queryTerms, queryStudentEnrollments, queryTeacherAssignments, queryGuardians, queryPickupPersons } from '@/lib/supabase';

const bulkOperationSchema = z.object({
  school_id: z.string().uuid(),
  module_name: z.string(),
  operation_type: z.enum(['delete', 'archive', 'activate', 'deactivate', 'update', 'assign_class', 'assign_subject', 'assign_teacher']),
  target_ids: z.array(z.string()),
  update_data: z.record(z.any()).optional(),
  assignment_target: z.string().optional(),
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
    const { module_name, operation_type, target_ids, update_data, assignment_target } =
      bulkOperationSchema.parse(body);

    if (!target_ids || target_ids.length === 0) {
      return NextResponse.json(
        { error: 'No target records specified' },
        { status: 400 }
      );
    }

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

    let succeeded = 0;
    const errors: Array<{ id: string; error: string }> = [];

    // Process each target ID
    for (const id of target_ids) {
      try {
        let query = queryFunc()
          .update({})
          .eq('id', id)
          .eq('school_id', schoolId);

        let updatePayload: Record<string, any> = {};

        switch (operation_type) {
          case 'delete':
            await queryFunc().delete().eq('id', id).eq('school_id', schoolId);
            succeeded++;
            break;

          case 'archive':
            updatePayload = { status: 'Inactive', archived_at: new Date().toISOString() };
            const archiveResult = await queryFunc()
              .update(updatePayload)
              .eq('id', id)
              .eq('school_id', schoolId);
            if (!archiveResult.error) succeeded++;
            else throw archiveResult.error;
            break;

          case 'activate':
            updatePayload = { status: 'Active', archived_at: null };
            const activateResult = await queryFunc()
              .update(updatePayload)
              .eq('id', id)
              .eq('school_id', schoolId);
            if (!activateResult.error) succeeded++;
            else throw activateResult.error;
            break;

          case 'deactivate':
            updatePayload = { status: 'Inactive' };
            const deactivateResult = await queryFunc()
              .update(updatePayload)
              .eq('id', id)
              .eq('school_id', schoolId);
            if (!deactivateResult.error) succeeded++;
            else throw deactivateResult.error;
            break;

          case 'update':
            if (!update_data) throw new Error('update_data is required for update operation');
            updatePayload = update_data;
            const updateResult = await queryFunc()
              .update(updatePayload)
              .eq('id', id)
              .eq('school_id', schoolId);
            if (!updateResult.error) succeeded++;
            else throw updateResult.error;
            break;

          case 'assign_class':
          case 'assign_subject':
          case 'assign_teacher':
            if (!assignment_target) throw new Error('assignment_target is required');
            const assignmentField = operation_type === 'assign_class' 
              ? 'class_id' 
              : operation_type === 'assign_subject' 
              ? 'subject_id' 
              : 'teacher_id';
            
            updatePayload = { [assignmentField]: assignment_target };
            const assignResult = await queryFunc()
              .update(updatePayload)
              .eq('id', id)
              .eq('school_id', schoolId);
            if (!assignResult.error) succeeded++;
            else throw assignResult.error;
            break;
        }
      } catch (error) {
        errors.push({
          id,
          error: error instanceof Error ? error.message : 'Operation failed',
        });
      }
    }

    return NextResponse.json({
      success: true,
      processed: target_ids.length,
      succeeded,
      failed: target_ids.length - succeeded,
      errors,
    });
  } catch (error) {
    console.error('[v0] Bulk operation error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Operation failed' },
      { status: 500 }
    );
  }
}
