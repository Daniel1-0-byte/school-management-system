'use client';

import React, { useState } from 'react';
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

  const handleCreate = async (data: StaffCreateInput) => {
    try {
      setSaving(true);
      setError(null);
      const { staff: created, error } = await SchoolService.createStaff(params.schoolId, data);
      if (error) {
        setError(error);
      } else if (created) {
        router.push(`/school/${params.schoolId}/staff`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create staff member');
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
            <h1 className="text-3xl font-bold text-foreground">Add Staff Member</h1>
            <p className="text-muted-foreground">Create a new staff member record</p>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Form */}
        <div className="bg-card rounded-lg border border-border p-6">
          <StaffForm
            loading={saving}
            onSubmit={handleCreate}
            submitLabel="Create Staff Member"
          />
        </div>
      </div>
    </div>
  );
}
