import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { queryAuditLogs, getPaginatedResults, formatSupabaseError } from '@/lib/supabase';

// GET /api/platform-admin/audit-logs - Fetch audit logs with filters
export async function GET(request: NextRequest) {
  try {
    const headersList = await headers();
    const adminId = headersList.get('x-admin-id');

    if (!adminId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const action = searchParams.get('action') || '';
    const targetType = searchParams.get('targetType') || '';
    const actorId = searchParams.get('actorId') || '';
    const schoolId = searchParams.get('schoolId') || '';
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';

    let query = queryAuditLogs().select('*', { count: 'exact' });

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
      query = query.gte('created_at', startDate).lte('created_at', endDate);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error, count } = await getPaginatedResults(query, page, pageSize);

    if (error) {
      console.error('[v0] Failed to fetch audit logs:', error);
      return NextResponse.json({ error: formatSupabaseError(error) }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: data || [],
      total: count || 0,
      page,
      pageSize,
      hasMore: page * pageSize < (count || 0),
    });
  } catch (error) {
    console.error('[v0] Error fetching audit logs:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/platform-admin/audit-logs/export - Export audit logs
export async function POST(request: NextRequest) {
  try {
    const headersList = await headers();
    const adminId = headersList.get('x-admin-id');

    if (!adminId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { format = 'csv', filters } = body;

    let query = queryAuditLogs().select('*');

    if (filters?.action) {
      query = query.eq('action', filters.action);
    }
    if (filters?.targetType) {
      query = query.eq('target_type', filters.targetType);
    }
    if (filters?.startDate && filters?.endDate) {
      query = query.gte('created_at', filters.startDate).lte('created_at', filters.endDate);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('[v0] Failed to fetch audit logs for export:', error);
      return NextResponse.json({ error: formatSupabaseError(error) }, { status: 400 });
    }

    if (format === 'csv') {
      const csvHeaders = [
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
        csvHeaders.join(','),
        ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
      ].join('\n');

      return new Response(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="audit-logs.csv"',
        },
      });
    } else {
      return NextResponse.json({
        success: true,
        data: data || [],
        count: data?.length || 0,
      });
    }
  } catch (error) {
    console.error('[v0] Error exporting audit logs:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
