import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { queryClasses, formatSupabaseError } from '@/lib/supabase';
import { getSchoolIdFromRequest, validateSchoolIdAccess } from '@/lib/auth-utils';

const bulkClassSchema = z.object({
  class_name: z.string().min(1),
  grade_level: z.string().min(1),
  section: z.string().min(1),
  capacity: z.number().optional(),
  class_teacher_id: z.string().optional(),
  academic_year_id: z.string().optional(),
  status: z.enum(['active', 'inactive', 'archived']).default('active'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { classes } = body as { classes: unknown[] };

    if (!Array.isArray(classes)) {
      return NextResponse.json({ error: 'Classes must be an array' }, { status: 400 });
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

    for (let i = 0; i < classes.length; i++) {
      try {
        const cls = classes[i];
        const validatedData = bulkClassSchema.parse(cls);

        const { error } = await queryClasses()
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
      total: classes.length,
    });
  } catch (error) {
    console.error('[v0] Bulk POST error:', error);
    return NextResponse.json({ error: 'Failed to bulk import classes' }, { status: 500 });
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

    // Fetch all classes for export
    const { data, error } = await queryClasses().select('*').eq('school_id', schoolId);

    if (error) {
      return NextResponse.json({ error: formatSupabaseError(error) }, { status: 400 });
    }

    let content: string;
    let mimeType: string;
    let filename: string;

    if (format === 'csv') {
      // CSV format
      const headers = [
        'class_name',
        'grade_level',
        'section',
        'capacity',
        'class_teacher_id',
        'academic_year_id',
        'status',
      ];
      const rows = (data || []).map((cls: any) =>
        headers.map((header) => {
          const value = cls[header];
          return typeof value === 'string' && (value.includes(',') || value.includes('"'))
            ? `"${value.replace(/"/g, '""')}"`
            : value || '';
        }).join(',')
      );
      content = [headers.join(','), ...rows].join('\n');
      mimeType = 'text/csv';
      filename = `classes-${new Date().toISOString().split('T')[0]}.csv`;
    } else if (format === 'json') {
      // JSON format
      content = JSON.stringify(data, null, 2);
      mimeType = 'application/json';
      filename = `classes-${new Date().toISOString().split('T')[0]}.json`;
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
    return NextResponse.json({ error: 'Failed to export classes' }, { status: 500 });
  }
}
