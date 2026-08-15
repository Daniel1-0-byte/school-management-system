import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  queryAcademicYears,
  querySchoolClassStreams,
  queryStudentEnrollments,
  queryStudents,
  getPaginatedResults,
  formatSupabaseError,
} from '@/lib/supabase';
import {
  getSchoolIdFromRequest,
  validateSchoolIdAccess,
  requireRole,
  requireGradeStreamAccess,
} from '@/lib/auth-utils';
import { generateAdmissionNumber } from '@/lib/services/admission-number-service';

const studentSchema = z.object({
  first_name: z.string().min(1, 'First name required'),
  last_name: z.string().min(1, 'Last name required'),
  gender: z.enum(['male', 'female'], { message: 'Gender is required' }),
  date_of_birth: z.string().optional(),
  admission_number: z.string().optional(),
  current_class_id: z.string().uuid().optional(),
  current_class_name: z.string().optional(),
  current_stream_id: z.string().uuid().optional(),
  current_stream_name: z.string().optional(),
  status: z.enum(['active', 'inactive', 'graduated']).default('active'),
  parental_status: z.string().optional(),
  medical_notes: z.string().optional(),
  allergies: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const streamId = request.nextUrl.searchParams.get('stream_id') || '';
  const adminRoleError = await requireRole(request, ['Admin']);

  if (adminRoleError) {
    // Teachers may only use this endpoint for the roster of a stream whose
    // parent class they are actively assigned to for that academic year.
    if (!streamId) {
      return NextResponse.json(
        { error: 'Teachers must provide a stream_id for roster access' },
        { status: 403 }
      );
    }
  }

  try {
    const page = parseInt(request.nextUrl.searchParams.get('page') || '1');
    const pageSize = parseInt(request.nextUrl.searchParams.get('pageSize') || '20');
    const search = request.nextUrl.searchParams.get('search') || '';
    const schoolId = await getSchoolIdFromRequest(request);
    const status = request.nextUrl.searchParams.get('status') || '';

    if (typeof schoolId !== 'string') {
      return NextResponse.json({ error: 'Invalid school ID' }, { status: 400 });
    }

    const validation = await validateSchoolIdAccess(schoolId);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error || 'Invalid school access' },
        { status: 400 }
      );
    }

    if (adminRoleError) {
      const { data: stream, error: streamError } = await querySchoolClassStreams()
        .select('academic_year_id')
        .eq('id', streamId)
        .eq('school_id', schoolId)
        .maybeSingle();

      if (streamError || !stream?.academic_year_id) {
        return NextResponse.json({ error: 'Stream not found' }, { status: 404 });
      }

      const teacherAccessError = await requireGradeStreamAccess(
        request,
        schoolId,
        streamId,
        stream.academic_year_id
      );
      if (teacherAccessError) return teacherAccessError;
    }

    let query = queryStudents()
      .select('*', { count: 'exact' })
      .eq('school_id', schoolId);

    if (search) {
      query = query.or(
        `first_name.ilike.%${search}%,last_name.ilike.%${search}%,admission_number.ilike.%${search}%`
      );
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (streamId) {
      const { data: enrollments, error: enrollmentError } = await queryStudentEnrollments()
        .select('student_id')
        .eq('school_id', schoolId)
        .eq('stream_id', streamId)
        .eq('status', 'active');

      if (enrollmentError) {
        console.error('[v0] Students stream enrollment filter error:', enrollmentError);
        return NextResponse.json(
          { error: formatSupabaseError(enrollmentError) },
          { status: 400 }
        );
      }

      const studentIds = (enrollments || []).map(
        (enrollment: { student_id: string }) => enrollment.student_id
      );
      if (studentIds.length === 0) {
        return NextResponse.json({ data: [], total: 0, page, pageSize });
      }

      query = query.in('id', studentIds);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error, count } = await getPaginatedResults(query, page, pageSize);

    if (error) {
      console.error('[v0] Students GET error:', error);
      return NextResponse.json({ error: formatSupabaseError(error) }, { status: 400 });
    }

    const students = data || [];
    const studentIds = students.map((student: { id: string }) => student.id);
    let streamByStudentId = new Map<string, { id: string; name: string }>();

    if (studentIds.length > 0) {
      const { data: enrollments, error: streamError } = await queryStudentEnrollments()
        .select('student_id, stream_id, school_class_streams(id, name, school_class_id, school_classes(name))')
        .eq('school_id', schoolId)
        .in('student_id', studentIds)
        .eq('status', 'active');

      if (streamError) {
        console.error('[v0] Students stream lookup error:', streamError);
        return NextResponse.json(
          { error: formatSupabaseError(streamError) },
          { status: 400 }
        );
      }

      streamByStudentId = new Map(
        (enrollments || [])
          .filter((enrollment: any) => enrollment.stream_id && enrollment.school_class_streams)
          .map((enrollment: any) => [
            enrollment.student_id,
            {
              id: enrollment.stream_id,
              name: [
                enrollment.school_class_streams.school_classes?.name,
                enrollment.school_class_streams.name,
              ]
                .filter(Boolean)
                .join(' - '),
            },
          ])
      );
    }

    return NextResponse.json({
      data: students.map((student: any) => ({
        ...student,
        current_stream_id: streamByStudentId.get(student.id)?.id || null,
        current_stream_name: streamByStudentId.get(student.id)?.name || null,
      })),
      total: count || 0,
      page,
      pageSize,
    });
  } catch (error) {
    console.error('[v0] Students GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch students' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const roleError = await requireRole(request, ['Admin']);
  if (roleError) return roleError;
  try {
    const body = await request.json();
    const validatedData = studentSchema.parse(body);
    const schoolId = await getSchoolIdFromRequest(request);

    if (typeof schoolId !== 'string') {
      return NextResponse.json({ error: 'Invalid school ID' }, { status: 400 });
    }

    const validation = await validateSchoolIdAccess(schoolId);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error || 'Invalid school access' },
        { status: 400 }
      );
    }

    const {
      admission_number: _ignoredAdmissionNumber,
      current_stream_id: streamId,
      current_stream_name: _streamName,
      current_class_id: requestedClassId,
      current_class_name: className,
      ...studentFields
    } = validatedData;

    let classId = requestedClassId;

    if (streamId && !classId) {
      const { data: stream, error: streamError } = await querySchoolClassStreams()
        .select('school_class_id')
        .eq('id', streamId)
        .eq('school_id', schoolId)
        .maybeSingle();

      if (streamError) {
        console.error('[v0] Student stream lookup error:', streamError);
        return NextResponse.json(
          { error: formatSupabaseError(streamError) },
          { status: 400 }
        );
      }

      classId = stream?.school_class_id;
    }

    if (!classId) {
      return NextResponse.json(
        { error: 'A class or class stream is required for enrollment' },
        { status: 400 }
      );
    }

    const { data: academicYear, error: academicYearError } = await queryAcademicYears()
      .select('id')
      .eq('school_id', schoolId)
      .order('start_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (academicYearError || !academicYear) {
      console.error('[v0] Student academic year lookup error:', academicYearError);
      return NextResponse.json(
        { error: academicYearError ? formatSupabaseError(academicYearError) : 'Create an academic year before enrolling students' },
        { status: 400 }
      );
    }

    const admissionNumber = await generateAdmissionNumber(schoolId);
    const { data: student, error: studentError } = await queryStudents()
      .insert({
        ...studentFields,
        admission_number: admissionNumber,
        current_class_id: classId,
        current_class_name: className,
        school_id: schoolId,
      })
      .select()
      .single();

    if (studentError || !student) {
      console.error('[v0] Students POST error:', studentError);
      return NextResponse.json(
        { error: formatSupabaseError(studentError) },
        { status: 400 }
      );
    }

    const { error: enrollmentError } = await queryStudentEnrollments()
      .insert({
        student_id: student.id,
        school_id: schoolId,
        class_id: classId,
        stream_id: streamId,
        academic_year_id: academicYear.id,
        enrollment_date: new Date().toISOString().slice(0, 10),
        status: 'active',
      });

    if (enrollmentError) {
      console.error('[v0] Student enrollment creation error:', enrollmentError);
      const { error: rollbackError } = await queryStudents()
        .delete()
        .eq('id', student.id)
        .eq('school_id', schoolId);

      if (rollbackError) {
        console.error('[v0] Student rollback error:', rollbackError);
      }

      return NextResponse.json(
        {
          error: 'Failed to create student enrollment',
          details: formatSupabaseError(enrollmentError),
        },
        { status: 400 }
      );
    }

    return NextResponse.json(student, { status: 201 });
  } catch (error) {
    console.error('[v0] Students POST error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json(
      { error: 'Failed to create student' },
      { status: 500 }
    );
  }
}
