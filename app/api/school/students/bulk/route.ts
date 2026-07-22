import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { queryStudents, formatSupabaseError } from '@/lib/supabase';
import { getSchoolIdFromRequest, validateSchoolIdAccess } from '@/lib/auth-utils';

const bulkStudentSchema = z.object({
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  date_of_birth: z.string().optional(),
  admission_number: z.string().optional(),
  current_class_id: z.string().uuid().optional(),
  current_class_name: z.string().optional(),
  status: z.enum(['active', 'inactive', 'graduated']).default('active'),
  parental_status: z.string().optional(),
  medical_notes: z.string().optional(),
  allergies: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { students } = body as { students: unknown[] };

    if (!Array.isArray(students)) {
      return NextResponse.json({ error: 'Students must be an array' }, { status: 400 });
    }

    const schoolId = await getSchoolIdFromRequest(request);
    if (typeof schoolId !== 'string') {
      return NextResponse.json({ error: 'Invalid school ID' }, { status: 400 });
    }

    const validation = await validateSchoolIdAccess(schoolId);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error || 'Invalid school access' }, { status: 400 });
    }

    const errors: Array<{ row: number; error: string }> = [];
    let created = 0;

    for (let i = 0; i < students.length; i++) {
      try {
        const student = students[i];
        const validatedData = bulkStudentSchema.parse(student);

        const { error } = await queryStudents()
          .insert({
            ...validatedData,
            school_id: schoolId,
          })
          .select()
          .single();

        if (error) {
          errors.push({ row: i + 1, error: formatSupabaseError(error) });
        } else {
          created++;
        }
      } catch (err) {
        errors.push({
          row: i + 1,
          error: err instanceof Error ? err.message : 'Validation failed',
        });
      }
    }

    return NextResponse.json({
      created,
      errors,
      total: students.length,
    });
  } catch (error) {
    console.error('[v0] Bulk POST error:', error);
    return NextResponse.json({ error: 'Failed to bulk import students' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const format = request.nextUrl.searchParams.get('format') || 'csv';
    const schoolId = await getSchoolIdFromRequest(request);

    if (typeof schoolId !== 'string') {
      return NextResponse.json({ error: 'Invalid school ID' }, { status: 400 });
    }

    const validation = await validateSchoolIdAccess(schoolId);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error || 'Invalid school access' }, { status: 400 });
    }

    // Fetch all students for export
    const { data, error } = await queryStudents().select('*').eq('school_id', schoolId);

    if (error) {
      return NextResponse.json({ error: formatSupabaseError(error) }, { status: 400 });
    }

    let content: string;
    let mimeType: string;
    let filename: string;

    if (format === 'csv') {
      // CSV format
      const headers = [
        'first_name',
        'last_name',
        'admission_number',
        'date_of_birth',
        'current_class_id',
        'current_class_name',
        'status',
        'parental_status',
        'medical_notes',
        'allergies',
      ];
      const rows = (data || []).map((student: any) =>
        headers.map((header) => {
          const value = student[header];
          // Escape quotes and wrap in quotes if needed
          return typeof value === 'string' && (value.includes(',') || value.includes('"')) 
            ? `"${value.replace(/"/g, '""')}"` 
            : value || '';
        }).join(',')
      );
      content = [headers.join(','), ...rows].join('\n');
      mimeType = 'text/csv';
      filename = `students-${new Date().toISOString().split('T')[0]}.csv`;
    } else if (format === 'json') {
      // JSON format
      content = JSON.stringify(data, null, 2);
      mimeType = 'application/json';
      filename = `students-${new Date().toISOString().split('T')[0]}.json`;
    } else {
      return NextResponse.json({ error: 'Unsupported format' }, { status: 400 });
    }

    return new NextResponse(content, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('[v0] Bulk GET error:', error);
    return NextResponse.json({ error: 'Failed to export students' }, { status: 500 });
  }
}
