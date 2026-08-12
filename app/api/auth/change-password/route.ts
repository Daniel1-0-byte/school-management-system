import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getUserIdFromRequest } from '@/lib/auth-utils';

export async function POST(request: NextRequest) {
  const userId = getUserIdFromRequest(request);
  const authToken = request.cookies.get('sb-auth-token')?.value;
  if (!userId || !authToken) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });

  try {
    const payload = JSON.parse(Buffer.from(authToken.split('.')[1], 'base64').toString()) as { email?: string };
    const { currentPassword, newPassword } = await request.json();
    if (!payload.email || typeof currentPassword !== 'string' || typeof newPassword !== 'string' || newPassword.length < 8) {
      return NextResponse.json({ error: 'Current password and a valid new password are required.' }, { status: 400 });
    }

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: signIn, error: signInError } = await supabase.auth.signInWithPassword({ email: payload.email, password: currentPassword });
    if (signInError || signIn.user?.id !== userId) return NextResponse.json({ error: 'Current password is incorrect.' }, { status: 400 });

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) return NextResponse.json({ error: 'Unable to update password.' }, { status: 400 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Unable to update password.' }, { status: 400 });
  }
}
