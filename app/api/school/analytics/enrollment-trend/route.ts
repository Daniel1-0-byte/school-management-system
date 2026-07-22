import { NextRequest, NextResponse } from 'next/server';
import { queryStudentEnrollments } from '@/lib/supabase';
import { getSchoolIdFromRequest, validateSchoolIdAccess } from '@/lib/auth-utils';

export async function GET(request: NextRequest) {
  try {
    const schoolId = await getSchoolIdFromRequest(request);
    if (!schoolId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const accessError = await validateSchoolIdAccess(schoolId);
    if (accessError) {
      return NextResponse.json({ error: accessError }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const months = parseInt(searchParams.get('months') || '6');

    // Get enrollments for the past N months
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const { data: enrollments, error } = await queryStudentEnrollments()
      .select('created_at')
      .gte('created_at', startDate.toISOString());

    if (error) {
      return NextResponse.json({ data: [] });
    }

    // Group by month
    const monthlyData: Record<string, number> = {};
    const now = new Date();

    for (let i = months - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setMonth(date.getMonth() - i);
      const monthKey = date.toLocaleString('default', { month: 'short', year: '2-digit' });
      monthlyData[monthKey] = 0;
    }

    // Count enrollments by month
    if (enrollments) {
      enrollments.forEach((enrollment) => {
        if (enrollment.created_at) {
          const date = new Date(enrollment.created_at);
          const monthKey = date.toLocaleString('default', { month: 'short', year: '2-digit' });
          if (monthKey in monthlyData) {
            monthlyData[monthKey]++;
          }
        }
      });
    }

    const data = Object.entries(monthlyData).map(([month, value]) => ({
      month,
      value,
    }));

    return NextResponse.json({ data });
  } catch (err) {
    console.error('[v0] Enrollment trend error:', err);
    return NextResponse.json(
      { data: [], error: 'Failed to fetch enrollment trend' },
      { status: 500 }
    );
  }
}
