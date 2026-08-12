'use client';

import { FormEvent, useState } from 'react';
import { AlertCircle, CheckCircle2, Lock, Loader2 } from 'lucide-react';

export default function AccountPage() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Unable to change password.');
      }

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setMessage('Password changed successfully.');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to change password.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Account</h1>
        <p className="mt-1 text-muted-foreground">Manage your personal account security.</p>
      </div>

      <section className="rounded-lg border border-border bg-card p-6">
        <div className="mb-6 flex items-start gap-3">
          <div className="rounded-lg bg-primary/10 p-2 text-primary">
            <Lock className="size-5" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground">Change password</h2>
            <p className="mt-1 text-sm text-muted-foreground">Update the password for your own account.</p>
          </div>
        </div>

        {error && (
          <div role="alert" className="mb-4 flex gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-600">
            <AlertCircle className="size-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {message && (
          <div role="status" className="mb-4 flex gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-700">
            <CheckCircle2 className="size-5 shrink-0" />
            <span>{message}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block text-sm font-medium text-foreground">
            Current password
            <input
              type="password"
              required
              autoComplete="current-password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              className="mt-2 w-full rounded-lg border border-border bg-background px-4 py-2 text-foreground outline-none focus:border-primary"
            />
          </label>
          <label className="block text-sm font-medium text-foreground">
            New password
            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              className="mt-2 w-full rounded-lg border border-border bg-background px-4 py-2 text-foreground outline-none focus:border-primary"
            />
          </label>
          <label className="block text-sm font-medium text-foreground">
            Confirm new password
            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="mt-2 w-full rounded-lg border border-border bg-background px-4 py-2 text-foreground outline-none focus:border-primary"
            />
          </label>
          <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2 font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50">
            {saving && <Loader2 className="size-4 animate-spin" />}
            {saving ? 'Updating...' : 'Change password'}
          </button>
        </form>
      </section>
    </div>
  );
}
