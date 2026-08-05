'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, AlertCircle, Loader2, ArrowRight } from 'lucide-react';

interface ProceedToReportsButtonProps {
  academicYearId: string;
  termId: string;
  streamId: string;
  onStatusChange?: (complete: boolean) => void;
}

interface CompletionStatus {
  complete: boolean;
  total_subjects: number;
  completed_subjects: number;
  missing_subjects: Array<{
    id: string;
    name: string;
    progress: string;
  }>;
  message: string;
}

export function ProceedToReportsButton({
  academicYearId,
  termId,
  streamId,
  onStatusChange,
}: ProceedToReportsButtonProps) {
  const router = useRouter();
  const [status, setStatus] = useState<CompletionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch completion status
  useEffect(() => {
    const fetchCompletionStatus = async () => {
      if (!academicYearId || !termId || !streamId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          `/api/school/grades/completion-status?academic_year_id=${academicYearId}&term_id=${termId}&stream_id=${streamId}`
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to check completion status');
        }

        const data = await response.json();
        setStatus(data);
        onStatusChange?.(data.complete);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to check completion status';
        console.error('[v0] Completion status error:', errorMsg);
        setError(errorMsg);
      } finally {
        setLoading(false);
      }
    };

    fetchCompletionStatus();
  }, [academicYearId, termId, streamId, onStatusChange]);

  const handleProceedToReports = () => {
    if (!status?.complete) return;

    // Navigate to reports with context parameters
    const params = new URLSearchParams({
      academic_year_id: academicYearId,
      term_id: termId,
      stream_id: streamId,
    });

    router.push(`/reports?${params.toString()}`);
  };

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Checking Grade Completion
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Verifying all subjects have been graded...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-destructive">Error</h3>
            <p className="text-xs text-destructive/80 mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!status) {
    return null;
  }

  const isComplete = status.complete;
  const progressPercent = status.total_subjects > 0
    ? Math.round((status.completed_subjects / status.total_subjects) * 100)
    : 0;

  return (
    <div className="bg-card border border-border rounded-lg p-6 space-y-4">
      {/* Status Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            {isComplete ? (
              <>
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                Grade Entry Complete
              </>
            ) : (
              <>
                <AlertCircle className="w-5 h-5 text-amber-600" />
                Grade Entry In Progress
              </>
            )}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">{status.message}</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-foreground">
            Subjects Complete
          </p>
          <p className="text-xs font-semibold text-primary">
            {status.completed_subjects}/{status.total_subjects}
          </p>
        </div>
        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              isComplete ? 'bg-green-600' : 'bg-blue-600'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Missing Subjects (if any) */}
      {!isComplete && status.missing_subjects.length > 0 && (
        <div className="bg-muted/50 rounded-lg p-3 border border-border">
          <p className="text-xs font-semibold text-foreground mb-2">
            Pending Subjects ({status.missing_subjects.length}):
          </p>
          <ul className="space-y-1">
            {status.missing_subjects.map((subject) => (
              <li key={subject.id} className="text-xs text-muted-foreground flex justify-between">
                <span>{subject.name}</span>
                <span className="text-foreground font-medium">{subject.progress}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Action Button */}
      <button
        onClick={handleProceedToReports}
        disabled={!isComplete}
        className={`w-full py-2 px-4 rounded-lg font-medium flex items-center justify-center gap-2 transition-all ${
          isComplete
            ? 'bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer'
            : 'bg-muted text-muted-foreground cursor-not-allowed opacity-50'
        }`}
      >
        Proceed to Reports
        <ArrowRight className="w-4 h-4" />
      </button>

      {/* Helper Text */}
      {!isComplete && (
        <p className="text-xs text-muted-foreground text-center">
          Complete grade entry for all assigned subjects to proceed to Reports.
        </p>
      )}
    </div>
  );
}
