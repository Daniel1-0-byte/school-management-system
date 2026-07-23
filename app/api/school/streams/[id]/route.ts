import { NextRequest, NextResponse } from 'next/server';
import { StreamService } from '@/lib/services/stream-service';
import { getSchoolIdFromRequest, validateSchoolIdAccess } from '@/lib/auth-utils';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const schoolId = await getSchoolIdFromRequest(request);

    if (typeof schoolId !== 'string') {
      return NextResponse.json({ error: 'Invalid school ID' }, { status: 400 });
    }

    const validation = await validateSchoolIdAccess(schoolId);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error || 'Invalid school access' }, { status: 403 });
    }

    const result = await StreamService.getStreamDetails(params.id);

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    // Verify the stream belongs to this school
    if (result.data && result.data.schoolId !== schoolId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    return NextResponse.json({ data: result.data });
  } catch (error) {
    console.error('[v0] Stream GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch stream' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const schoolId = await getSchoolIdFromRequest(request);

    if (typeof schoolId !== 'string') {
      return NextResponse.json({ error: 'Invalid school ID' }, { status: 400 });
    }

    const validation = await validateSchoolIdAccess(schoolId);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error || 'Invalid school access' }, { status: 403 });
    }

    // Verify stream belongs to school before deleting
    const streamDetails = await StreamService.getStreamDetails(params.id);
    if (streamDetails.error || !streamDetails.data) {
      return NextResponse.json({ error: 'Stream not found' }, { status: 404 });
    }

    if (streamDetails.data.schoolId !== schoolId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Deactivate the stream
    const result = await StreamService.deactivateStream(params.id);

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[v0] Stream DELETE error:', error);
    return NextResponse.json({ error: 'Failed to deactivate stream' }, { status: 500 });
  }
}
