import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from '@/lib/env';
import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/platform-admin/audit-logs - Fetch audit logs with filters
export async function GET(request: NextRequest) {
  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'Supabase configuration missing' },
        { status: 500 }
      );
    }

    const headersList = await headers();
    const adminId = headersList.get('x-admin-id');

    if (!adminId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const action = searchParams.get('action') || '';
    const targetType = searchParams.get('targetType') || '';
    const actorId = searchParams.get('actorId') || '';
    const schoolId = searchParams.get('schoolId') || '';
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';

    let query = supabase
      .from('audit_logs')
      .select('*', { count: 'exact' });

    // Apply filters
    if (action) {
      query = query.eq('action', action);
    }

    if (targetType) {
      query = query.eq('target_type', targetType);
    }

    if (actorId) {
      query = query.eq('actor_id', actorId);
    }

    if (schoolId) {
      query = query.eq('school_id', schoolId);
    }

    if (startDate && endDate) {
      query = query
        .gte('created_at', startDate)
        .lte('created_at', endDate);
    }

    query = query.order('created_at', { ascending: false });

    const start = (page - 1) * pageSize;
    query = query.range(start, start + pageSize - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('[v0] Failed to fetch audit logs:', error);
      return NextResponse.json(
        { error: 'Failed to fetch audit logs' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: data || [],
      total: count || 0,
      page,
      pageSize,
      hasMore: (page * pageSize) < (count || 0),
    });

  } catch (error) {
    console.error('[v0] Error fetching audit logs:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/platform-admin/audit-logs/export - Export audit logs
export async function POST(request: NextRequest) {
  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'Supabase configuration missing' },
        { status: 500 }
      );
    }

    const headersList = await headers();
    const adminId = headersList.get('x-admin-id');

    if (!adminId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { format = 'csv', filters } = body; // csv or json

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    let query = supabase.from('audit_logs').select('*');

    // Apply filters if provided
    if (filters?.action) {
      query = query.eq('action', filters.action);
    }
    if (filters?.targetType) {
      query = query.eq('target_type', filters.targetType);
    }
    if (filters?.startDate && filters?.endDate) {
      query = query
        .gte('created_at', filters.startDate)
        .lte('created_at', filters.endDate);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('[v0] Failed to fetch audit logs for export:', error);
      return NextResponse.json(
        { error: 'Failed to fetch audit logs' },
        { status: 500 }
      );
    }

    if (format === 'csv') {
      // Convert to CSV
      const headers = [
        'ID',
        'Action',
        'Target Type',
        'Target ID',
        'Target Name',
        'Actor ID',
        'School ID',
        'IP Address',
        'Created At',
      ];

      const rows = (data || []).map((log: any) => [
        log.id,
        log.action,
        log.target_type,
        log.target_id,
        log.target_name || '',
        log.actor_id || '',
        log.school_id || '',
        log.ip_address || '',
        log.created_at,
      ]);

      const csv = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
      ].join('\n');

      return new Response(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="audit-logs.csv"',
        },
      });
    } else {
      // Return JSON
      return NextResponse.json({
        success: true,
        data: data || [],
        count: data?.length || 0,
      });
    }

  } catch (error) {
    console.error('[v0] Error exporting audit logs:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
