import { NextRequest, NextResponse } from 'next/server';
import { RECAPTCHA_SECRET_KEY } from '@/lib/env';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'CAPTCHA token is required' },
        { status: 400 }
      );
    }

    // Verify token with Google reCAPTCHA
    const verificationUrl = 'https://www.google.com/recaptcha/api/siteverify';
    const response = await fetch(verificationUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `secret=${RECAPTCHA_SECRET_KEY}&response=${token}`,
    });

    const data = await response.json();

    if (!data.success) {
      return NextResponse.json(
        { success: false, error: 'CAPTCHA verification failed' },
        { status: 400 }
      );
    }

    // Score-based verification for v3, or just success for v2
    const score = data.score || 0;
    if (score < 0.5) {
      return NextResponse.json(
        { success: false, error: 'CAPTCHA score too low' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[v0] CAPTCHA verification error:', error);
    return NextResponse.json(
      { success: false, error: 'CAPTCHA verification failed' },
      { status: 500 }
    );
  }
}
