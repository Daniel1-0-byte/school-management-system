'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mail, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const verifyEmail = async () => {
      const token = searchParams.get('token');

      if (!token) {
        setError('No verification token provided');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch('/api/auth/verify-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });

        const data = await response.json();

        if (!response.ok) {
          setError(data.error || 'Verification failed');
          setLoading(false);
          return;
        }

        setVerified(true);
        setLoading(false);

        // Redirect to setup after 2 seconds
        setTimeout(() => {
          router.push('/setup');
        }, 2000);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Verification error');
        setLoading(false);
      }
    };

    verifyEmail();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 text-center space-y-6">
          {loading && (
            <>
              <div className="flex justify-center">
                <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white mb-2">Verifying Email</h1>
                <p className="text-slate-400">Please wait while we verify your email address...</p>
              </div>
            </>
          )}

          {verified && !error && (
            <>
              <div className="flex justify-center">
                <CheckCircle2 className="w-12 h-12 text-green-500" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white mb-2">Email Verified</h1>
                <p className="text-slate-400">Your email has been successfully verified. Redirecting to setup...</p>
              </div>
            </>
          )}

          {error && (
            <>
              <div className="flex justify-center">
                <AlertCircle className="w-12 h-12 text-red-500" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white mb-2">Verification Failed</h1>
                <p className="text-slate-400 mb-6">{error}</p>
                <button
                  onClick={() => router.push('/login')}
                  className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  Back to Login
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading...</p>
        </div>
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
