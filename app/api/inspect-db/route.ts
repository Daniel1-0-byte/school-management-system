import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  // Use hardcoded Supabase URL and JWT_5 (service role key)
  const supabaseUrl = 'https://gjwobfrenindszbkyltm.supabase.co';
  const serviceRoleKey = process.env.JWT_5;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { error: 'Missing Supabase credentials', url: supabaseUrl, key: !!serviceRoleKey },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  try {
    // Create an authenticated client
    const client = createClient(supabaseUrl, serviceRoleKey);
    
    // Query all tables in public schema
    const { data: tables, error: tablesError } = await client.rpc('get_tables');
    
    if (tablesError) {
      // Fallback: Query directly via SQL using the client
      const { data, error } = await client
        .from('pg_tables')
        .select('tablename')
        .eq('schemaname', 'public');

      if (error) {
        // Try a different approach - fetch from a known table to test connection first
        const { data: testData, error: testError } = await client
          .from('schools')
          .select('id')
          .limit(1);

        if (testError) {
          return NextResponse.json({
            connected: false,
            error: 'Failed to connect to database',
            details: testError.message,
            supabaseUrl
          }, { status: 500 });
        }

        // If we can query schools, get all table names from schema
        return NextResponse.json({
          connected: true,
          supabaseUrl,
          message: 'Connected successfully, but table listing unavailable via REST API. Using direct schema mapping from codebase migrations instead.',
          tablesAccessible: ['schools', 'profiles', 'grade_entries', 'assessments', 'school_class_streams', 'school_grading_policies', 'student_enrollments', 'class_subjects', 'subjects', 'academic_years', 'terms']
        });
      }

      const schema = [];
      for (const table of data || []) {
        schema.push({
          table: table.tablename,
          columns: [],
          note: 'Column details unavailable via REST API'
        });
      }

      return NextResponse.json({
        connected: true,
        supabaseUrl,
        tableCount: schema.length,
        schema
      });
    }

    // If we got here, process tables normally
    const schema = [];
    for (const table of tables || []) {
      schema.push({
        table: table.tablename,
        columns: []
      });
    }

    return NextResponse.json({
      connected: true,
      supabaseUrl,
      tableCount: schema.length,
      schema
    });
  } catch (err) {
    return NextResponse.json(
      { error: 'Database inspection failed', details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
