'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';
import { platformAdminLoginSchema, twoFactorSchema, type PlatformAdminLoginFormData, type TwoFactorFormData } from '@/lib/schemas';
import { ZodError } from 'zod';

interface FormErrors {
  [key: string]: string;
}

type LoginStep = 'credentials' | 'totp' | 'loading';

export default function PlatformAdminLoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<LoginStep>('credentials');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [generalError, setGeneralError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loginFormData, setLoginFormData] = useState<Partial<PlatformAdminLoginFormData>>({
    email: '',
    password: '',
  });

  const [totpFormData, setTotpFormData] = useState<Partial<TwoFactorFormData>>({
    code: '',
  });

  // ============================================================================
  // CREDENTIALS STEP
  // ============================================================================

  const handleCredentialsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.currentTarget;
    setLoginFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError('');
    setErrors({});
    setLoading(true);

    try {
      let captchaToken = '';
      const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || '';

      if (typeof window !== 'undefined' && window.grecaptcha) {
        try {
          // Log before executing reCAPTCHA
          if (process.env.NODE_ENV === 'development' || typeof localStorage !== 'undefined' && localStorage.getItem('AUTH_DEBUG') === 'true') {
            console.log('[reCAPTCHA FRONTEND] Starting grecaptcha.execute', {
              siteKeyExists: !!siteKey,
              siteKeyLength: siteKey.length,
              action: 'login',
            });
          }

          captchaToken = await window.grecaptcha.execute(siteKey, { action: 'login' });

          // Log after receiving token
          if (process.env.NODE_ENV === 'development' || typeof localStorage !== 'undefined' && localStorage.getItem('AUTH_DEBUG') === 'true') {
            console.log('[reCAPTCHA FRONTEND] Token received', {
              exists: !!captchaToken,
              length: captchaToken.length,
              first20: captchaToken.slice(0, 20),
              last20: captchaToken.slice(-20),
            });
          }

          // TASK 4: Verify frontend is waiting for token before submitting
          if (!captchaToken) {
            console.error('[reCAPTCHA FRONTEND] Token is empty after execution');
            setGeneralError('reCAPTCHA token generation failed');
            setLoading(false);
            return;
          }
        } catch (error) {
          console.error('[reCAPTCHA FRONTEND] Error during grecaptcha.execute:', error);
          setGeneralError('reCAPTCHA failed. Please try again.');
          setLoading(false);
          return;
        }
      } else {
        console.warn('[reCAPTCHA FRONTEND] grecaptcha not available');
      }

      const validated = platformAdminLoginSchema.parse({
        ...loginFormData,
        captchaToken,
      });

      // Call platform admin login API
      const response = await fetch('/api/platform-admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validated),
      });

      const result = await response.json() as {
        success: boolean;
        error?: string;
        requiresTwoFactor?: boolean;
        sessionId?: string;
      };

      if (!response.ok || !result.success) {
        setGeneralError(result.error || 'Login failed');
        setLoading(false);
        return;
      }

      if (result.requiresTwoFactor) {
        // Store session ID for next step
        sessionStorage.setItem('platform-admin-session', result.sessionId || '');
        setStep('totp');
        setLoading(false);
      } else {
        // No 2FA required, redirect to dashboard
        router.push('/platform-admin');
      }
    } catch (error) {
      if (error instanceof ZodError) {
        const fieldErrors: FormErrors = {};
        const zodError = error as unknown as { issues?: Array<{ path: (string | number)[]; message: string }> };
        if (zodError.issues) {
          zodError.issues.forEach(issue => {
            const path = issue.path.join('.');
            fieldErrors[path] = issue.message;
          });
        }
        setErrors(fieldErrors);
      } else {
        setGeneralError('An unexpected error occurred');
      }
      setLoading(false);
    }
  };

  // ============================================================================
  // TOTP STEP
  // ============================================================================

  const handleTotpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.currentTarget;
    // Only allow digits
    const filtered = value.replace(/[^0-9]/g, '').slice(0, 6);
    setTotpFormData({ code: filtered });
    if (errors.code) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.code;
        return newErrors;
      });
    }
  };

  const handleTotpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError('');
    setErrors({});
    setLoading(true);

    try {
      const validated = twoFactorSchema.parse(totpFormData);

      const sessionId = sessionStorage.getItem('platform-admin-session');
      if (!sessionId) {
        setGeneralError('Session expired. Please log in again.');
        setStep('credentials');
        setLoading(false);
        return;
      }

      // Call 2FA verification API
      const response = await fetch('/api/platform-admin/verify-2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          code: validated.code,
        }),
      });

      const result = await response.json() as { success: boolean; error?: string };

      if (!response.ok || !result.success) {
        setGeneralError(result.error || 'Invalid code');
        setLoading(false);
        return;
      }

      // Clean up session storage
      sessionStorage.removeItem('platform-admin-session');

      // Redirect to dashboard
      router.push('/platform-admin');
    } catch (error) {
      if (error instanceof ZodError) {
        const fieldErrors: FormErrors = {};
        const zodError = error as unknown as { issues?: Array<{ path: (string | number)[]; message: string }> };
        if (zodError.issues) {
          zodError.issues.forEach(issue => {
            const path = issue.path.join('.');
            fieldErrors[path] = issue.message;
          });
        }
        setErrors(fieldErrors);
      } else {
        setGeneralError('An unexpected error occurred');
      }
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-xl p-8 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-white">Super Admin Access</h1>
          <p className="text-slate-400">Platform administration requires authentication</p>
        </div>

        {generalError && (
          <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-200">{generalError}</p>
          </div>
        )}

        {/* CREDENTIALS STEP */}
        {step === 'credentials' && (
          <form onSubmit={handleCredentialsSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Email Address
              </label>
              <input
                type="email"
                name="email"
                value={loginFormData.email}
                onChange={handleCredentialsChange}
                disabled={loading}
                className={`w-full px-4 py-2 rounded-lg bg-slate-700 border ${
                  errors.email ? 'border-red-500' : 'border-slate-600'
                } text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors disabled:opacity-50`}
                placeholder="admin@schoolhub.com"
              />
              {errors.email && <p className="mt-1 text-sm text-red-400">{errors.email}</p>}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={loginFormData.password}
                  onChange={handleCredentialsChange}
                  disabled={loading}
                  className={`w-full px-4 py-2 rounded-lg bg-slate-700 border ${
                    errors.password ? 'border-red-500' : 'border-slate-600'
                  } text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors pr-10 disabled:opacity-50`}
                  placeholder="Enter password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-white disabled:opacity-50"
                  disabled={loading}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-sm text-red-400">{errors.password}</p>}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold hover:shadow-lg hover:shadow-blue-500/50 transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-6"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Signing In...' : 'Continue'}
            </button>
          </form>
        )}

        {/* TOTP STEP */}
        {step === 'totp' && (
          <form onSubmit={handleTotpSubmit} className="space-y-4">
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 text-sm text-blue-200">
              <p>Two-factor authentication is enabled for your account.</p>
              <p className="mt-2">Enter the 6-digit code from your authenticator app.</p>
            </div>

            {/* TOTP Code */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Authentication Code
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={totpFormData.code}
                onChange={handleTotpChange}
                disabled={loading}
                maxLength={6}
                className={`w-full px-4 py-2 rounded-lg bg-slate-700 border ${
                  errors.code ? 'border-red-500' : 'border-slate-600'
                } text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors text-center text-2xl letter-spacing-2 disabled:opacity-50 font-mono`}
                placeholder="000000"
              />
              {errors.code && <p className="mt-1 text-sm text-red-400">{errors.code}</p>}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !totpFormData.code || totpFormData.code.length !== 6}
              className="w-full px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold hover:shadow-lg hover:shadow-blue-500/50 transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-6"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Verifying...' : 'Verify & Sign In'}
            </button>

            {/* Back Button */}
            <button
              type="button"
              onClick={() => {
                setStep('credentials');
                setGeneralError('');
                setErrors({});
              }}
              disabled={loading}
              className="w-full px-4 py-2 text-slate-400 hover:text-white transition-colors disabled:opacity-50"
            >
              Back
            </button>
          </form>
        )}

        <div className="pt-4 border-t border-slate-700 text-center text-sm text-slate-400">
          <p>This is a restricted administrative area.</p>
          <Link href="/" className="text-blue-400 hover:text-blue-300 mt-2 inline-block">
            Return to Home
          </Link>
        </div>
      </div>

      {/* reCAPTCHA script */}
      <script
        src={`https://www.google.com/recaptcha/api.js?render=${process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY}`}
        async
        defer
      />
    </div>
  );
}
