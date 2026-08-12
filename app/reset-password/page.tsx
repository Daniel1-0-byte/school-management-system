'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { Lock, Loader2 } from 'lucide-react';
import { getSupabaseClientSide } from '@/lib/supabase';

const RECOVERY_TIMEOUT_MS = 10000;

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingRecovery, setCheckingRecovery] = useState(true);
  const [recoverySessionEstablished, setRecoverySessionEstablished] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseClientSide();
    const timeoutId = window.setTimeout(() => {
      setCheckingRecovery(false);
      setError('This reset link is invalid or has expired. Please request a new one.');
    }, RECOVERY_TIMEOUT_MS);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      if (event === 'PASSWORD_RECOVERY' && session) {
        window.clearTimeout(timeoutId);
        setRecoverySessionEstablished(true);
        setCheckingRecovery(false);
        setError('');
      }
    });

    return () => {
      window.clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setMessage('');

    if (!recoverySessionEstablished) {
      setError('This reset link is invalid or has expired. Please request a new one.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    const { error: updateError } = await getSupabaseClientSide().auth.updateUser({ password });
    if (updateError) {
      setError('Unable to update password. Please request a new reset link.');
    } else {
      setMessage('Your password has been updated.');
      setPassword('');
      setConfirm('');
      setRecoverySessionEstablished(false);
    }
    setLoading(false);
  };

  if (checkingRecovery) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
        <div className="flex items-center gap-3 text-sm text-muted-foreground" role="status">
          <Loader2 className="size-5 animate-spin" />
          Verifying your reset link...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background px-4 py-12 text-foreground">
      <div className="mx-auto max-w-md">
        <section className="rounded-xl border border-border bg-card p-8">
          <div className="flex items-center gap-2">
            <Lock className="size-5 text-primary" />
            <h1 className="text-2xl font-bold">Set a new password</h1>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">Choose a new password for your account.</p>
          {error && <p className="mt-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-600">{error}</p>}
          {message && <p className="mt-4 rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-700">{message}</p>}
          {recoverySessionEstablished && !message && (
            <form onSubmit={submit} className="mt-6 space-y-4">
              <input required minLength={8} type="password" autoComplete="new-password" placeholder="New password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-lg border border-border bg-background px-4 py-2" />
              <input required minLength={8} type="password" autoComplete="new-password" placeholder="Confirm new password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="w-full rounded-lg border border-border bg-background px-4 py-2" />
              <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground disabled:opacity-50">
                {loading && <Loader2 className="size-4 animate-spin" />}
                {loading ? 'Updating...' : 'Update password'}
              </button>
            </form>
          )}
          {(message || error) && <Link href="/forgot-password" className="mt-4 block text-center text-sm text-primary">Request a new reset link</Link>}
        </section>
      </div>
    </main>
  );
}
