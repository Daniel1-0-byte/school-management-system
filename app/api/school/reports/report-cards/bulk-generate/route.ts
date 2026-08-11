import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabaseClient } from '@/lib/supabase';
import { getSchoolIdFromRequest, validateSchoolIdAccess, requireRole } from '@/lib/auth-utils';

interface BulkGenerateResponse {
  success: boolean;
  total_generated: number;
  report_urls: Array<{
    student_id: string;
    student_name: string;
    preview_url: string;
  }>;
}

/**
 * POST /api/school/reports/report-cards/bulk-generate
 * Generate report card preview URLs for all students in a class/stream
 * 
 * Body:
 * - stream_id: UUID
 * - term_id: UUID
 * - academic_year_id: UUID
 */
export async function POST(request: NextRequest) {
  const roleError = await requireRole(request, ['Admin']);
  if (roleError) return roleError;
  try {
    const schoolId = await getSchoolIdFromRequest(request);

    if (typeof schoolId !== 'string') {
      return NextResponse.json({ error: 'Invalid school ID' }, { status: 400 });
    }

    const validation = await validateSchoolIdAccess(schoolId);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error || 'Invalid school access' }, { status: 403 });
    }

    const body = await request.json();
    const { stream_id, term_id, academic_year_id } = body;

    if (!stream_id || !term_id || !academic_year_id) {
      return NextResponse.json(
        { error: 'stream_id, term_id, and academic_year_id are required' },
        { status: 400 }
      );
    }

    const supabase = getServerSupabaseClient();

    // Fetch stream/class information
    const { data: stream, error: streamError } = await supabase
      .from('school_class_streams')
      .select('school_class_id, name')
      .eq('id', stream_id)
      .eq('school_id', schoolId)
      .single();

    if (streamError || !stream) {
      return NextResponse.json({ error: 'Stream not found' }, { status: 404 });
    }

    // Fetch enrolled students
    const { data: enrollments, error: enrollError } = await supabase
      .from('student_enrollments')
      .select('student_id, students(id, first_name, last_name)')
      .eq('school_id', schoolId)
      .eq('class_id', stream.school_class_id)
      .eq('academic_year_id', academic_year_id)
      .eq('status', 'active')
      .order('students(first_name)');

    if (enrollError || !enrollments) {
      return NextResponse.json(
        { error: 'Failed to fetch enrolled students' },
        { status: 500 }
      );
    }

    if (enrollments.length === 0) {
      return NextResponse.json<BulkGenerateResponse>({
        success: true,
        total_generated: 0,
        report_urls: [],
      });
    }

    // Generate preview URLs for each student
    const reportUrls = enrollments.map((enrollment: any) => {
      const student = enrollment.students;
      const params = new URLSearchParams({
        student_id: enrollment.student_id,
        term_id,
        academic_year_id,
      });

      return {
        student_id: enrollment.student_id,
        student_name: `${student.first_name} ${student.last_name}`,
        preview_url: `/reports/preview?${params.toString()}`,
      };
    });

    return NextResponse.json<BulkGenerateResponse>({
      success: true,
      total_generated: reportUrls.length,
      report_urls: reportUrls,
    });
  } catch (error) {
    console.error('[v0] Bulk generate error:', error);
    return NextResponse.json(
      { error: 'Failed to generate bulk report cards' },
      { status: 500 }
    );
  }
}
