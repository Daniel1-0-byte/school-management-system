'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

function StaffInviteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [invitation, setInvitation] = useState<any>(null);
  const [error, setError] = useState('');
  const [password, setPassword] = useState('');
  const [acceptingLoading, setAcceptingLoading] = useState(false);
  const [accepted, setAccepted] = useState(false);

  const token = searchParams.get('token');

  useEffect(() => {
    const validateInvitation = async () => {
      if (!token) {
        setError('No invitation token provided');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(
          `/api/school/staff/invite/accept?token=${encodeURIComponent(token)}`
        );
        const data = await response.json();

        if (!response.ok) {
          setError(data.error || 'Invalid or expired invitation');
          setLoading(false);
          return;
        }

        setInvitation(data.data);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to validate invitation');
        setLoading(false);
      }
    };

    validateInvitation();
  }, [token]);

  const handleAcceptInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password) {
      setError('Password is required');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setAcceptingLoading(true);
    setError('');

    try {
      const response = await fetch('/api/school/staff/invite/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to accept invitation');
        setAcceptingLoading(false);
        return;
      }

      setAccepted(true);
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept invitation');
      setAcceptingLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 space-y-6">
          {loading && (
            <>
              <div className="flex justify-center">
                <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
              </div>
              <p className="text-center text-slate-400">Loading invitation details...</p>
            </>
          )}

          {error && !loading && (
            <>
              <div className="flex justify-center">
                <AlertCircle className="w-12 h-12 text-red-500" />
              </div>
              <div className="text-center">
                <h1 className="text-xl font-bold text-white mb-2">Invalid Invitation</h1>
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

          {accepted && (
            <>
              <div className="flex justify-center">
                <CheckCircle2 className="w-12 h-12 text-green-500" />
              </div>
              <div className="text-center">
                <h1 className="text-xl font-bold text-white mb-2">Invitation Accepted</h1>
                <p className="text-slate-400">Your account has been created. Redirecting to login...</p>
              </div>
            </>
          )}

          {invitation && !error && !accepted && (
            <form onSubmit={handleAcceptInvitation} className="space-y-6">
              <div className="text-center">
                <h1 className="text-2xl font-bold text-white mb-2">
                  Welcome, {invitation.first_name}!
                </h1>
                <p className="text-slate-400">You&apos;ve been invited to {invitation.school_name}</p>
              </div>

              <div className="bg-slate-700/50 rounded-lg p-4 space-y-2">
                <p className="text-sm text-slate-400">
                  <span className="font-medium">Role:</span> {invitation.system_role}
                </p>
                {invitation.department && (
                  <p className="text-sm text-slate-400">
                    <span className="font-medium">Department:</span> {invitation.department}
                  </p>
                )}
                <p className="text-sm text-slate-400">
                  <span className="font-medium">Email:</span> {invitation.email}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Create Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white focus:border-blue-500 outline-none"
                  placeholder="At least 8 characters"
                  minLength={8}
                />
                <p className="text-xs text-slate-500 mt-1">Password must be at least 8 characters</p>
              </div>

              <button
                type="submit"
                disabled={acceptingLoading}
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                {acceptingLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                {acceptingLoading ? 'Creating Account...' : 'Accept Invitation'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default function StaffInvitePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading invitation...</p>
        </div>
      </div>
    }>
      <StaffInviteContent />
    </Suspense>
  );
}
