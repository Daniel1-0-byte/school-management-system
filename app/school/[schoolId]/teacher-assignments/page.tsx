'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { AlertCircle, Loader2 } from 'lucide-react';
import { TeacherAssignmentForm } from '@/components/teacher-assignment-form';
import { TeacherAssignmentsTable } from '@/components/teacher-assignments-table';
import { SchoolService } from '@/lib/services/school-service';
import type { TeacherAssignment } from '@/lib/transformers/teacher-assignment-transformer';

export default function TeacherAssignmentsPage() {
  const params = useParams();
  const schoolId = params.schoolId as string;
  const [assignments, setAssignments] = useState<TeacherAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (!schoolId) return;
    fetchAssignments();
  }, [schoolId, page]);

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await SchoolService.getTeacherAssignments(schoolId, {
        page,
        pageSize: 10,
      });

      if (result.error) {
        setError(result.error);
      } else {
        setAssignments(result.assignments);
        setTotal(result.total);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch assignments');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this assignment?')) return;

    try {
      const result = await SchoolService.deleteTeacherAssignment(schoolId, id);
      if (result.error) {
        setError(result.error);
      } else {
        await fetchAssignments();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete assignment');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Teacher Assignments</h1>
          <p className="text-muted-foreground mt-2">Assign teachers to classes and subjects for the academic year</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-red-600">Error</p>
              <p className="text-sm text-red-600">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-600 hover:text-red-700"
            >
              ✕
            </button>
          </div>
        )}

        {/* Create Form */}
        <div className="mb-8 bg-card border border-border rounded-lg p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Create New Assignment</h2>
          <TeacherAssignmentForm schoolId={schoolId} onSuccess={fetchAssignments} />
        </div>

        {/* Assignments List */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="p-6 border-b border-border">
            <h2 className="text-lg font-semibold text-foreground">
              Current Assignments ({total})
            </h2>
          </div>

          {loading ? (
            <div className="p-8 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="p-6">
              <TeacherAssignmentsTable
                assignments={assignments}
                onEdit={(assignment) => {
                  console.log('Edit assignment:', assignment);
                }}
                onDelete={handleDelete}
              />
            </div>
          )}

          {/* Pagination */}
          {total > 10 && (
            <div className="p-6 border-t border-border flex items-center justify-between">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
              >
                Previous
              </button>

              <span className="text-sm text-muted-foreground">
                Page {page} of {Math.ceil(total / 10)}
              </span>

              <button
                onClick={() => setPage(page + 1)}
                disabled={page * 10 >= total}
                className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
