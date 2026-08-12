'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { getSupabaseClientSide } from '@/lib/supabase';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true); setError(''); setMessage('');
    const redirectTo = `${window.location.origin}/reset-password`;
    const { error: resetError } = await getSupabaseClientSide().auth.resetPasswordForEmail(email, { redirectTo });
    if (resetError) setError('Unable to send reset email. Please check the address and try again.');
    else setMessage('If an account exists for that email, a password reset link has been sent.');
    setLoading(false);
  };

  return <main className="min-h-screen bg-background px-4 py-12 text-foreground"><div className="mx-auto max-w-md space-y-6"><Link href="/login" className="inline-flex items-center gap-2 text-muted-foreground"><ArrowLeft className="size-4" />Back to login</Link><section className="rounded-xl border border-border bg-card p-8"><h1 className="text-2xl font-bold">Forgot password?</h1><p className="mt-2 text-sm text-muted-foreground">Enter your email and we&apos;ll send a secure reset link.</p>{error && <p className="mt-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-600">{error}</p>}{message && <p className="mt-4 rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-700">{message}</p>}<form onSubmit={submit} className="mt-6 space-y-4"><label className="block text-sm font-medium">Email address<input required type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-2 w-full rounded-lg border border-border bg-background px-4 py-2" /></label><button disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground disabled:opacity-50">{loading && <Loader2 className="size-4 animate-spin" />}{loading ? 'Sending...' : 'Send reset link'}</button></form></section></div></main>;
}
