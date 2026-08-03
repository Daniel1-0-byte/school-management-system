import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  const supabaseUrl = 'https://gjwobfrenindszbkyltm.supabase.co';
  const serviceRoleKey = process.env.JWT_5;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: 'Missing credentials' }, { status: 500 });
  }

  const client = createClient(supabaseUrl, serviceRoleKey);

  try {
    const tables = [
      'schools', 'profiles', 'grade_entries', 'assessments', 
      'school_class_streams', 'school_grading_policies', 'student_enrollments',
      'class_subjects', 'subjects', 'academic_years', 'terms', 'students'
    ];

    const schema: any = {};

    for (const tableName of tables) {
      try {
        // Fetch one row to inspect columns
        const { data, error } = await client
          .from(tableName)
          .select('*')
          .limit(1);

        if (error) {
          schema[tableName] = { error: error.message };
          continue;
        }

        if (data && data.length > 0) {
          const columns = Object.keys(data[0]);
          schema[tableName] = {
            columnCount: columns.length,
            columns: columns,
            sampleRow: data[0]
          };
        } else {
          const { data: emptyData, error: structError } = await client
            .from(tableName)
            .select('*')
            .limit(0);

          if (emptyData && Array.isArray(emptyData)) {
            schema[tableName] = {
              columnCount: 0,
              columns: [],
              empty: true
            };
          } else {
            schema[tableName] = { error: structError?.message || 'Unable to determine schema' };
          }
        }
      } catch (err) {
        schema[tableName] = { error: err instanceof Error ? err.message : 'Unknown error' };
      }
    }

    return NextResponse.json({
      connected: true,
      supabaseUrl,
      schema
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to inspect database' },
      { status: 500 }
    );
  }
}
