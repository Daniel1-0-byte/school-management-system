import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const staffSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  role: z.string(),
  department: z.string().optional(),
  joinDate: z.string(),
});

export async function GET(request: NextRequest) {
  try {
    const page = parseInt(request.nextUrl.searchParams.get('page') || '1');
    const pageSize = parseInt(request.nextUrl.searchParams.get('pageSize') || '10');
    const search = request.nextUrl.searchParams.get('search') || '';
    const role = request.nextUrl.searchParams.get('role') || '';
    const status = request.nextUrl.searchParams.get('status') || 'active';

    // Mock data - TODO: Replace with Supabase
    const mockStaff = [
      {
        id: 'staff-1',
        firstName: 'Rajesh',
        lastName: 'Sharma',
        email: 'rajesh@school.edu',
        phone: '+91-9876543210',
        role: 'Teacher',
        department: 'Mathematics',
        joinDate: '2020-06-15',
        status: 'active',
      },
      {
        id: 'staff-2',
        firstName: 'Priya',
        lastName: 'Patel',
        email: 'priya@school.edu',
        phone: '+91-9876543211',
        role: 'Teacher',
        department: 'Science',
        joinDate: '2021-07-20',
        status: 'active',
      },
      {
        id: 'staff-3',
        firstName: 'Arun',
        lastName: 'Desai',
        email: 'arun@school.edu',
        phone: '+91-9876543212',
        role: 'Principal',
        department: 'Administration',
        joinDate: '2015-04-10',
        status: 'active',
      },
    ];

    let filtered = mockStaff;

    if (search) {
      filtered = filtered.filter(
        (s) =>
          s.firstName.toLowerCase().includes(search.toLowerCase()) ||
          s.lastName.toLowerCase().includes(search.toLowerCase()) ||
          s.email.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (role) {
      filtered = filtered.filter((s) => s.role === role);
    }

    if (status) {
      filtered = filtered.filter((s) => s.status === status);
    }

    const start = (page - 1) * pageSize;
    const data = filtered.slice(start, start + pageSize);

    return NextResponse.json({
      data,
      total: filtered.length,
      page,
      pageSize,
    });
  } catch (error) {
    console.error('[v0] Staff GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch staff' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = staffSchema.parse(body);

    // TODO: Save to Supabase
    return NextResponse.json({
      success: true,
      data: { id: 'new-staff', ...validatedData, status: 'active' },
    });
  } catch (error) {
    console.error('[v0] Staff POST error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      { error: 'Failed to create staff' },
      { status: 500 }
    );
  }
}
