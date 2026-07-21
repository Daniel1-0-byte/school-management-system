'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';
import { loginSchema, type LoginFormData } from '@/lib/schemas';
import { ZodError } from 'zod';

interface FormErrors {
  [key: string]: string;
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [generalError, setGeneralError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState<Partial<LoginFormData>>({
    email: searchParams.get('email') || '',
    password: '',
  });

  useEffect(() => {
    // Check if user is already logged in
    const checkSession = async () => {
      try {
        const response = await fetch('/api/auth/session');
        if (response.ok) {
          router.push('/dashboard');
        }
      } catch (error) {
        // User not logged in, continue with login form
      }
    };
    checkSession();
  }, [router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.currentTarget;
    setFormData(prev => ({
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError('');
    setErrors({});
    setLoading(true);

    try {
      // Validate form data
      let captchaToken = '';
      if (typeof window !== 'undefined' && window.grecaptcha) {
        try {
          captchaToken = await window.grecaptcha.execute(
            process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || '',
            { action: 'login' }
          );
        } catch (error) {
          console.error('[v0] reCAPTCHA error:', error);
        }
      }

      const validated = loginSchema.parse({
        ...formData,
        captchaToken,
      });

      // Call login API
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validated),
      });

      const result = await response.json() as { 
        success: boolean; 
        error?: string; 
        redirectUrl?: string;
        data?: {
          schoolId?: string;
          setupCompleted?: boolean;
          needsSetup?: boolean;
        }
      };

      if (!response.ok || !result.success) {
        setGeneralError(result.error || 'Invalid email or password');
        setLoading(false);
        return;
      }

      // Store schoolId in sessionStorage if needed for setup
      if (result.data?.schoolId) {
        sessionStorage.setItem('schoolId', result.data.schoolId);
      }

      // Redirect to setup if needed, otherwise dashboard
      if (result.data?.needsSetup === true || result.data?.setupCompleted === false) {
        router.push('/setup');
      } else if (result.redirectUrl) {
        router.push(result.redirectUrl);
      } else {
        router.push('/dashboard');
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
        setGeneralError('An unexpected error occurred. Please try again.');
      }
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <div className="max-w-md w-full mx-auto p-4 py-12">
        <Link href="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 space-y-6">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-white">Log In</h1>
            <p className="text-slate-400">Sign in to your school account</p>
          </div>

          {generalError && (
            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 flex gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-200">{generalError}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Email Address
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                disabled={loading}
                className={`w-full px-4 py-2 rounded-lg bg-slate-700 border ${
                  errors.email ? 'border-red-500' : 'border-slate-600'
                } text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors disabled:opacity-50`}
                placeholder="your@school.edu"
                autoComplete="email"
              />
              {errors.email && <p className="mt-1 text-sm text-red-400">{errors.email}</p>}
            </div>

            {/* Password */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-slate-300">
                  Password
                </label>
                <Link href="/forgot-password" className="text-xs text-blue-400 hover:text-blue-300">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  disabled={loading}
                  className={`w-full px-4 py-2 rounded-lg bg-slate-700 border ${
                    errors.password ? 'border-red-500' : 'border-slate-600'
                  } text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors pr-10 disabled:opacity-50`}
                  placeholder="Enter your password"
                  autoComplete="current-password"
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
              {loading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-slate-400 text-sm">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="text-blue-400 hover:text-blue-300 font-semibold">
              Sign Up
            </Link>
          </p>
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
