import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const classSchema = z.object({
  name: z.string().min(1),
  section: z.string(),
  teacherId: z.string().optional(),
  roomNumber: z.string(),
  capacity: z.number().min(1),
});

export async function GET(request: NextRequest) {
  try {
    const page = parseInt(request.nextUrl.searchParams.get('page') || '1');
    const pageSize = parseInt(request.nextUrl.searchParams.get('pageSize') || '10');
    const search = request.nextUrl.searchParams.get('search') || '';

    // Mock data - TODO: Replace with Supabase
    const mockClasses = [
      {
        id: 'class-1',
        name: '10-A',
        section: 'A',
        teacherName: 'Mr. Sharma',
        studentCount: 35,
        roomNumber: '101',
        capacity: 50,
      },
      {
        id: 'class-2',
        name: '10-B',
        section: 'B',
        teacherName: 'Mrs. Patel',
        studentCount: 42,
        roomNumber: '102',
        capacity: 50,
      },
      {
        id: 'class-3',
        name: '11-A',
        section: 'A',
        teacherName: 'Dr. Desai',
        studentCount: 38,
        roomNumber: '201',
        capacity: 50,
      },
    ];

    const filtered = mockClasses.filter((c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.section.toLowerCase().includes(search.toLowerCase())
    );

    const start = (page - 1) * pageSize;
    const data = filtered.slice(start, start + pageSize);

    return NextResponse.json({
      data,
      total: filtered.length,
      page,
      pageSize,
    });
  } catch (error) {
    console.error('[v0] Classes GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch classes' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = classSchema.parse(body);

    // TODO: Save to Supabase
    return NextResponse.json({
      success: true,
      data: { id: 'new-class', ...validatedData },
    });
  } catch (error) {
    console.error('[v0] Classes POST error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      { error: 'Failed to create class' },
      { status: 500 }
    );
  }
}
