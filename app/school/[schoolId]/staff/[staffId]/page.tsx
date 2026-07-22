'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Loader2, Trash2 } from 'lucide-react';
import { SchoolService } from '@/lib/services/school-service';
import { StaffForm } from '@/components/staff-form';
import { Staff } from '@/lib/transformers/staff-transformer';
import type { StaffCreateInput } from '@/lib/validators/staff-validator';

export default function StaffDetailPage() {
  const router = useRouter();
  const params = useParams<{ schoolId: string; staffId: string }>();
  const [staff, setStaff] = useState<Staff | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStaff();
  }, [params.schoolId, params.staffId]);

  const loadStaff = async () => {
    try {
      setLoading(true);
      const { staff: staffData, error } = await SchoolService.getStaffMember(
        params.schoolId,
        params.staffId
      );
      if (error) {
        setError(error);
      } else if (staffData) {
        setStaff(staffData);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load staff member');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (data: StaffCreateInput) => {
    try {
      setSaving(true);
      setError(null);
      const { staff: updated, error } = await SchoolService.updateStaff(params.schoolId, params.staffId, data);
      if (error) {
        setError(error);
      } else {
        setStaff(updated || null);
        setTimeout(() => router.push(`/school/${params.schoolId}/staff`), 1000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update staff member');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this staff member?')) return;

    try {
      setDeleting(true);
      setError(null);
      const { success, error } = await SchoolService.deleteStaff(params.schoolId, params.staffId);
      if (error) {
        setError(error);
      } else if (success) {
        router.push(`/school/${params.schoolId}/staff`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete staff member');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push(`/school/${params.schoolId}/staff`)}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Edit Staff</h1>
              <p className="text-muted-foreground">Update staff member information</p>
            </div>
          </div>
          <button
            onClick={handleDelete}
            disabled={deleting || loading}
            className="p-2 hover:bg-red-500/10 rounded-lg transition-colors text-red-600 disabled:opacity-50"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Form */}
        {staff && !loading && (
          <div className="bg-card rounded-lg border border-border p-6">
            <StaffForm
              staff={staff}
              loading={saving}
              onSubmit={handleUpdate}
              submitLabel="Update Staff Member"
            />
          </div>
        )}
      </div>
    </div>
  );
}
