'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { SchoolService } from '@/lib/services/school-service';
import { StaffForm } from '@/components/staff-form';
import type { StaffCreateInput } from '@/lib/validators/staff-validator';

export default function CreateStaffPage() {
  const router = useRouter();
  const params = useParams<{ schoolId: string }>();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviterId, setInviterId] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    fetch('/api/auth/session', { credentials: 'include' })
      .then(async (response) => {
        if (!response.ok) throw new Error('Unable to load your session');
        const data = await response.json();
        const userId = data.session?.userId;
        if (!userId) throw new Error('Unable to identify the inviting user');
        setInviterId(userId);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Unable to load your session'));
  }, []);

  const getInviteErrorMessage = (message: string) => {
    if (message.includes('staff_invitations_school_id_email_key') || message.toLowerCase().includes('invitation already exists')) {
      return 'An invitation already exists for this email address in this school. Cancel the existing invitation or use a different email address.';
    }

    if (message.toLowerCase().includes('invalid email')) {
      return 'Enter a valid email address for the staff member.';
    }

    if (message.toLowerCase().includes('resend') || message.toLowerCase().includes('email was not sent')) {
      return message;
    }

    return message || 'We could not send the invitation. Please try again.';
  };

  const handleCreate = async (data: StaffCreateInput) => {
    try {
      if (!inviterId) {
        setError('Your session is still loading. Please try again.');
        return;
      }

      setSaving(true);
      setError(null);
      const { invitation, error } = await SchoolService.inviteStaff(params.schoolId, inviterId, data);
      if (error) {
        setError(getInviteErrorMessage(error));
      } else if (invitation) {
        setSent(true);
      }
    } catch (err) {
      setError(getInviteErrorMessage(err instanceof Error ? err.message : ''));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.push(`/school/${params.schoolId}/staff`)}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Invite Staff Member</h1>
            <p className="text-muted-foreground">Send an invitation so they can set a password and access the school portal</p>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {sent ? (
          <div className="bg-card rounded-lg border border-border p-8 text-center">
            <h2 className="text-xl font-semibold text-foreground">Invitation sent</h2>
            <p className="mt-2 text-muted-foreground">
              The staff member will receive an email with a link to set their password and finish setting up access.
            </p>
            <button
              onClick={() => router.push(`/school/${params.schoolId}/staff`)}
              className="mt-6 rounded-lg bg-primary px-4 py-2 text-primary-foreground hover:opacity-90 transition-opacity"
            >
              Back to Staff
            </button>
          </div>
        ) : (
          <div className="bg-card rounded-lg border border-border p-6">
            <StaffForm
              loading={saving || !inviterId}
              onSubmit={handleCreate}
              submitLabel="Send Invitation"
            />
          </div>
        )}
      </div>
    </div>
  );
}
