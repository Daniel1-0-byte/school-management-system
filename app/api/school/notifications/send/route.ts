import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { queryNotifications, formatSupabaseError } from '@/lib/supabase';
import { getSchoolIdFromRequest, validateSchoolIdAccess } from '@/lib/auth-utils';

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

    const { recipient_id, type, title, message } = z.object({
      recipient_id: z.string().uuid(),
      type: z.enum(['success', 'warning', 'info', 'error']),
      title: z.string().min(1).max(255),
      message: z.string().min(1).max(1000),
    }).parse(body);

    // Create notification in database
    const { error } = await queryNotifications()
      .insert({
        school_id: schoolId,
        recipient_id,
        title,
        message,
        type,
        is_read: false,
        created_at: new Date().toISOString(),
      });

    if (error) {
      console.error('[v0] Notification creation error:', error);
      return NextResponse.json({ error: formatSupabaseError(error) }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Notification sent successfully',
    });
  } catch (error) {
    console.error('[v0] Send notification error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to send notification' },
      { status: 500 }
    );
  }
}
