import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { queryProfiles, formatSupabaseError } from '@/lib/supabase';
import { getSchoolIdFromRequest, validateSchoolIdAccess } from '@/lib/auth-utils';

const bulkStaffSchema = z.object({
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  role: z.enum(['teacher', 'admin', 'staff']).default('teacher'),
  department: z.string().optional(),
  qualification: z.string().optional(),
  experience_years: z.number().optional(),
  date_of_joining: z.string().optional(),
  status: z.enum(['active', 'inactive', 'on_leave']).default('active'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { staff } = body as { staff: unknown[] };

    if (!Array.isArray(staff)) {
      return NextResponse.json({ error: 'Staff must be an array' }, { status: 400 });
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

    for (let i = 0; i < staff.length; i++) {
      try {
        const member = staff[i];
        const validatedData = bulkStaffSchema.parse(member);

        const { error } = await queryProfiles()
          .insert({
            ...validatedData,
            school_id: schoolId,
            id: crypto.randomUUID(),
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
      total: staff.length,
    });
  } catch (error) {
    console.error('[v0] Bulk POST error:', error);
    return NextResponse.json({ error: 'Failed to bulk import staff' }, { status: 500 });
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

    // Fetch all staff for export
    const { data, error } = await queryProfiles().select('*').eq('school_id', schoolId);

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
        'email',
        'phone',
        'role',
        'department',
        'qualification',
        'experience_years',
        'date_of_joining',
        'status',
      ];
      const rows = (data || []).map((member: any) =>
        headers.map((header) => {
          const value = member[header];
          return typeof value === 'string' && (value.includes(',') || value.includes('"'))
            ? `"${value.replace(/"/g, '""')}"`
            : value || '';
        }).join(',')
      );
      content = [headers.join(','), ...rows].join('\n');
      mimeType = 'text/csv';
      filename = `staff-${new Date().toISOString().split('T')[0]}.csv`;
    } else if (format === 'json') {
      // JSON format
      content = JSON.stringify(data, null, 2);
      mimeType = 'application/json';
      filename = `staff-${new Date().toISOString().split('T')[0]}.json`;
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
    return NextResponse.json({ error: 'Failed to export staff' }, { status: 500 });
  }
}
