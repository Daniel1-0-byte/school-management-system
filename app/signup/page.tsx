'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Eye, EyeOff, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { signupSchema, type SignupFormData } from '@/lib/schemas';
import { ZodError } from 'zod';

interface FormErrors {
  [key: string]: string;
}

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState<'form' | 'submitting' | 'success'>('form');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [generalError, setGeneralError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [formData, setFormData] = useState<Partial<SignupFormData>>({
    schoolName: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    tosAgreed: false,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, type, value, checked } = e.currentTarget;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    // Clear error for this field
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
    setStep('submitting');

    try {
      // Validate form data
      let captchaToken = '';
      
      // Get reCAPTCHA token
      if (typeof window !== 'undefined' && window.grecaptcha) {
        captchaToken = await window.grecaptcha.execute(
          process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || '',
          { action: 'signup' }
        );
      }

      const dataToValidate = {
        ...formData,
        captchaToken,
      };

      const validated = signupSchema.parse(dataToValidate);

      // Call signup API
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validated),
      });

      const result = await response.json() as { success: boolean; error?: string; data?: { schoolId: string } };

      if (!response.ok || !result.success) {
        setGeneralError(result.error || 'Signup failed. Please try again.');
        setStep('form');
        setLoading(false);
        return;
      }

      // Success!
      setStep('success');
      
      // Store schoolId in sessionStorage for setup page
      if (result.data?.schoolId) {
        sessionStorage.setItem('schoolId', result.data.schoolId);
        console.log('[v0][SIGNUP] Stored schoolId:', result.data.schoolId);
      }
      
      setTimeout(() => {
        // Redirect to setup wizard to complete school configuration
        router.push('/setup');
      }, 2000);
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
      setStep('form');
      setLoading(false);
    }
  };

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-xl p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
            <CheckCircle className="w-6 h-6 text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-white">Signup Successful!</h2>
          <p className="text-slate-400">
            Your account is ready! Our platform admin will review your school details. You&apos;ll be redirected to login shortly.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <div className="max-w-md w-full mx-auto p-4 py-12">
        <Link href="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 space-y-6">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-white">Register Your School</h1>
            <p className="text-slate-400">Create an account to get started with SchoolHub</p>
          </div>

          {generalError && (
            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 flex gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-200">{generalError}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* School Name */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                School Name *
              </label>
              <input
                type="text"
                name="schoolName"
                value={formData.schoolName}
                onChange={handleChange}
                disabled={loading}
                className={`w-full px-4 py-2 rounded-lg bg-slate-700 border ${
                  errors.schoolName ? 'border-red-500' : 'border-slate-600'
                } text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors disabled:opacity-50`}
                placeholder="Your School Name"
              />
              {errors.schoolName && <p className="mt-1 text-sm text-red-400">{errors.schoolName}</p>}
            </div>

            {/* Name Row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  First Name *
                </label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  disabled={loading}
                  className={`w-full px-4 py-2 rounded-lg bg-slate-700 border ${
                    errors.firstName ? 'border-red-500' : 'border-slate-600'
                  } text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors disabled:opacity-50`}
                  placeholder="First Name"
                />
                {errors.firstName && <p className="mt-1 text-sm text-red-400">{errors.firstName}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Last Name *
                </label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  disabled={loading}
                  className={`w-full px-4 py-2 rounded-lg bg-slate-700 border ${
                    errors.lastName ? 'border-red-500' : 'border-slate-600'
                  } text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors disabled:opacity-50`}
                  placeholder="Last Name"
                />
                {errors.lastName && <p className="mt-1 text-sm text-red-400">{errors.lastName}</p>}
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Work Email *
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
              />
              {errors.email && <p className="mt-1 text-sm text-red-400">{errors.email}</p>}
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Phone Number *
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                disabled={loading}
                className={`w-full px-4 py-2 rounded-lg bg-slate-700 border ${
                  errors.phone ? 'border-red-500' : 'border-slate-600'
                } text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors disabled:opacity-50`}
                placeholder="+1 (555) 000-0000"
              />
              {errors.phone && <p className="mt-1 text-sm text-red-400">{errors.phone}</p>}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Password *
              </label>
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
                  placeholder="At least 8 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-white"
                  disabled={loading}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-sm text-red-400">{errors.password}</p>}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Confirm Password *
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  disabled={loading}
                  className={`w-full px-4 py-2 rounded-lg bg-slate-700 border ${
                    errors.confirmPassword ? 'border-red-500' : 'border-slate-600'
                  } text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors pr-10 disabled:opacity-50`}
                  placeholder="Confirm password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-white"
                  disabled={loading}
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.confirmPassword && <p className="mt-1 text-sm text-red-400">{errors.confirmPassword}</p>}
            </div>

            {/* Terms Checkbox */}
            <div className="flex gap-3">
              <input
                type="checkbox"
                id="tosAgreed"
                name="tosAgreed"
                checked={formData.tosAgreed}
                onChange={handleChange}
                disabled={loading}
                className="rounded border-slate-600 mt-1 disabled:opacity-50"
              />
              <label htmlFor="tosAgreed" className="text-sm text-slate-400">
                I agree to the{' '}
                <Link href="/terms" target="_blank" className="text-blue-400 hover:text-blue-300">
                  Terms of Service
                </Link>
                {' '}and{' '}
                <Link href="/privacy" target="_blank" className="text-blue-400 hover:text-blue-300">
                  Privacy Policy
                </Link>
              </label>
            </div>
            {errors.tosAgreed && <p className="text-sm text-red-400">{errors.tosAgreed}</p>}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold hover:shadow-lg hover:shadow-blue-500/50 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Creating Account...' : 'Sign Up'}
            </button>
          </form>

          <p className="text-center text-slate-400 text-sm">
            Already have an account?{' '}
            <Link href="/login" className="text-blue-400 hover:text-blue-300 font-semibold">
              Log In
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
